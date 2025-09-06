// 📄 File: app/api/drugs/check-code/route.ts (UPDATED - Multiple Price Support)
// ✅ ปรับให้รองรับยาหลายราคาที่ใช้รหัสเดียวกัน + แสดงรายการยาที่มีอยู่

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema สำหรับ validation
const checkCodeSchema = z.object({
  code: z.string().min(1).max(50)
});

// GET - ตรวจสอบรหัสยาโรงพยาบาล (รองรับ multiple variants)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสยา" },
        { status: 400 }
      );
    }

    // Validate input
    const { code: validatedCode } = checkCodeSchema.parse({ code });

    // ✅ ค้นหายาทั้งหมดที่ใช้รหัสเดียวกัน (แทนที่จะเช็คแค่ตัวเดียว)
    const existingDrugs = await prisma.drug.findMany({
      where: {
        hospitalDrugCode: validatedCode,
        isActive: true
      },
      select: {
        id: true,
        hospitalDrugCode: true,
        name: true,
        genericName: true,
        dosageForm: true,
        strength: true,
        unit: true,
        category: true,
        packageSize: true,
        pricePerBox: true,
        notes: true,
        createdAt: true,
        stocks: {
          select: {
            department: true,
            totalQuantity: true
          }
        }
      },
      orderBy: [
        { pricePerBox: 'asc' }, // เรียงตามราคา
        { createdAt: 'asc' }    // แล้วเรียงตามวันที่สร้าง
      ]
    });

    // Generate suggestions for similar codes
    const similarCodes = await prisma.drug.findMany({
      where: {
        hospitalDrugCode: {
          contains: validatedCode.slice(0, 3), // ใช้ 3 ตัวแรก
          mode: 'insensitive'
        },
        isActive: true,
        NOT: {
          hospitalDrugCode: validatedCode
        }
      },
      select: {
        hospitalDrugCode: true,
        name: true,
        pricePerBox: true
      },
      take: 5,
      orderBy: {
        hospitalDrugCode: 'asc'
      }
    });

    // ✅ ถ้ามียาอยู่แล้ว แต่ไม่ถือว่า "duplicate" แบบเดิม
    if (existingDrugs.length > 0) {
      // คำนวณสถิติการใช้งาน
      const priceRange = {
        min: Math.min(...existingDrugs.map(d => d.pricePerBox)),
        max: Math.max(...existingDrugs.map(d => d.pricePerBox)),
        count: existingDrugs.length
      };

      // ข้อมูลยาที่จะใช้เป็น template สำหรับ auto-fill
      const templateDrug = existingDrugs[0]; // ใช้ตัวแรก (ราคาถูกที่สุด) เป็น template

      return NextResponse.json({
        available: true, // ✅ เปลี่ยนจาก false เป็น true (ใช้รหัสได้)
        exists: true,    // มีอยู่แล้วจริง
        canCreateVariant: true, // ✅ เพิ่ม flag ใหม่
        drugs: existingDrugs,
        templateDrug, // ข้อมูลสำหรับ auto-fill
        priceRange,
        suggestions: similarCodes,
        message: `รหัส "${validatedCode}" มี ${existingDrugs.length} รายการ (ราคา ฿${priceRange.min.toLocaleString()}-${priceRange.max.toLocaleString()})`
      });
    }

    // ถ้าไม่มียาเลย = รหัสใหม่
    return NextResponse.json({
      available: true,
      exists: false,
      canCreateVariant: false,
      drugs: [],
      templateDrug: null,
      priceRange: null,
      suggestions: similarCodes,
      message: `รหัส "${validatedCode}" ใช้ได้ (รหัสใหม่)`
    });

  } catch (error) {
    console.error('Check code error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "รหัสยาไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบรหัสยา" },
      { status: 500 }
    );
  }
}

// POST - ตรวจสอบหลายรหัสพร้อมกัน (สำหรับ bulk import) - Updated
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codes } = body;

    if (!Array.isArray(codes)) {
      return NextResponse.json(
        { error: "codes ต้องเป็น array" },
        { status: 400 }
      );
    }

    // Validate all codes
    const validatedCodes = codes.map(code => 
      checkCodeSchema.parse({ code }).code
    );

    // ✅ เช็คยาที่มีอยู่ (รวมหลายราคา)
    const existingDrugs = await prisma.drug.findMany({
      where: {
        hospitalDrugCode: {
          in: validatedCodes
        },
        isActive: true
      },
      select: {
        hospitalDrugCode: true,
        name: true,
        genericName: true,
        category: true,
        pricePerBox: true,
        createdAt: true
      },
      orderBy: [
        { hospitalDrugCode: 'asc' },
        { pricePerBox: 'asc' }
      ]
    });

    // Group by hospital drug code
    const drugsByCode = existingDrugs.reduce((acc, drug) => {
      if (!acc[drug.hospitalDrugCode]) {
        acc[drug.hospitalDrugCode] = [];
      }
      acc[drug.hospitalDrugCode].push(drug);
      return acc;
    }, {} as Record<string, typeof existingDrugs>);

    const results = validatedCodes.map(code => {
      const variants = drugsByCode[code] || [];
      return {
        code,
        available: true, // ✅ ทุกรหัสใช้ได้ (ไม่ว่าจะมีอยู่หรือไม่)
        exists: variants.length > 0,
        canCreateVariant: variants.length > 0,
        variantCount: variants.length,
        drugs: variants,
        priceRange: variants.length > 0 ? {
          min: Math.min(...variants.map(d => d.pricePerBox)),
          max: Math.max(...variants.map(d => d.pricePerBox)),
          count: variants.length
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: validatedCodes.length,
        newCodes: results.filter(r => !r.exists).length,
        existingCodes: results.filter(r => r.exists).length,
        totalVariants: results.reduce((sum, r) => sum + r.variantCount, 0)
      }
    });

  } catch (error) {
    console.error('Bulk check codes error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "รหัสยาบางตัวไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบรหัสยา" },
      { status: 500 }
    );
  }
}