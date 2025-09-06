// 📄 File: app/api/drugs/route.ts (FIXED - Notes Field)
// ✅ แก้ไขปัญหา notes field ไม่เข้า database

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z, ZodError, ZodIssue } from "zod";
import { Prisma, Department, DrugCategory } from "@prisma/client";
import { getServerUser } from "@/lib/auth-server";

// ✅ FIXED Schema - แก้ไข notes field validation
const createDrugSchema = z.object({
  hospitalDrugCode: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  genericName: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === undefined ? null : val)),
  dosageForm: z.enum(
    [
      "APP", "BAG", "CAP", "CR", "DOP", "ENE", "GEL", "HAN", "IMP",
      "INJ", "LIQ", "LOT", "LVP", "MDI", "MIX", "NAS", "NB", "OIN",
      "PAT", "POW", "PWD", "SAC", "SOL", "SPR", "SUP", "SUS", "SYR",
      "TAB", "TUR",
    ],
    { message: "รูปแบบยาไม่ถูกต้อง" }
  ),
  strength: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === undefined ? null : val)),
  unit: z.string().min(1).max(20),
  packageSize: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === undefined ? null : val)),
  pricePerBox: z.number().min(0).max(999999.99),
  category: z.enum(
    [
      "REFER", "HAD", "NARCOTIC", "REFRIGERATED", "PSYCHIATRIC",
      "FLUID", "GENERAL", "TABLET", "SYRUP", "INJECTION", "EXTEMP",
      "ALERT", "CANCELLED",
    ],
    { message: "ประเภทยาไม่ถูกต้อง" }
  ),
  // ✅ FIXED: notes field - รองรับทั้ง string และ null อย่างถูกต้อง
  notes: z
    .union([z.string(), z.null()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === "") {
        return null;
      }
      // ตรวจสอบความยาวสำหรับ string ที่ไม่ใช่ empty
      if (typeof val === "string" && val.trim().length > 1000) {
        throw new Error("หมายเหตุต้องไม่เกิน 1000 ตัวอักษร");
      }
      return val.trim() || null;
    }),
  initialQuantity: z.number().min(0).default(0),
  minimumStock: z.number().min(0).default(10),
  department: z.enum(["PHARMACY", "OPD"], { message: "แผนกไม่ถูกต้อง" }),
});

// GET - ดึงรายการยาทั้งหมด (เหมือนเดิม)
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 GET /api/drugs - Starting request");

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const department = searchParams.get("department") as Department | null;

    console.log("🔍 Search params:", { search, category, department });

    const where: Prisma.DrugWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { genericName: { contains: search, mode: "insensitive" } },
        { hospitalDrugCode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (
      category &&
      Object.values(DrugCategory).includes(category as DrugCategory)
    ) {
      where.category = category as DrugCategory;
    }

    const drugs = await prisma.drug.findMany({
      where,
      select: {
        id: true,
        hospitalDrugCode: true,
        name: true,
        genericName: true,
        dosageForm: true,
        strength: true,
        unit: true,
        packageSize: true,
        pricePerBox: true,
        category: true,
        notes: true, // ✅ รวม notes ใน response
        isActive: true,
        createdAt: true,
        updatedAt: true,
        stocks: department ? { where: { department } } : true,
        _count: { select: { stocks: true } },
      },
      orderBy: [{ hospitalDrugCode: "asc" }, { pricePerBox: "asc" }],
    });

    console.log("✅ GET /api/drugs - Found", drugs.length, "drugs");
    return NextResponse.json({ success: true, data: drugs });
  } catch (error) {
    console.error("❌ GET /api/drugs - Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลยา" },
      { status: 500 }
    );
  }
}

// ✅ FIXED POST - สร้างยาใหม่พร้อมสต็อกเริ่มต้น (แก้ไข notes handling)
export async function POST(request: NextRequest) {
  console.log("🔍 POST /api/drugs - Starting request");

  try {
    // Step 1: Get current user from authentication
    const currentUser = await getServerUser();
    if (!currentUser) {
      console.log("❌ No authenticated user found");
      return NextResponse.json(
        { error: "ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }
    console.log("✅ Current user:", currentUser.userId, currentUser.username);

    // Step 2: Parse request body
    const body = await request.json();
    console.log("🔍 Request body:", JSON.stringify(body, null, 2));

    // ✅ FIXED: Debug notes field specifically
    console.log("🔍 Notes field debug:", {
      notes: body.notes,
      notesType: typeof body.notes,
      notesLength: body.notes?.length,
      notesValue: JSON.stringify(body.notes)
    });

    // Step 3: Validate data
    console.log("🔍 Validating data with Zod schema...");
    const validatedData = createDrugSchema.parse(body);
    console.log("✅ Data validation passed:");
    console.log("  - hospitalDrugCode:", validatedData.hospitalDrugCode);
    console.log("  - name:", validatedData.name);
    console.log("  - notes:", JSON.stringify(validatedData.notes));
    console.log("  - notes type:", typeof validatedData.notes);

    // Step 4: เช็คราคาซ้ำสำหรับรหัสเดียวกัน
    console.log("🔍 Checking for existing price for code:", validatedData.hospitalDrugCode);
    const existingDrugWithSamePrice = await prisma.drug.findFirst({
      where: {
        hospitalDrugCode: validatedData.hospitalDrugCode,
        pricePerBox: validatedData.pricePerBox,
        isActive: true,
      },
    });

    if (existingDrugWithSamePrice) {
      console.log("❌ Same price already exists for this code");
      return NextResponse.json(
        {
          error: `รหัสยา "${
            validatedData.hospitalDrugCode
          }" ราคา ฿${validatedData.pricePerBox.toLocaleString()} มีอยู่ในระบบแล้ว`,
        },
        { status: 409 }
      );
    }
    console.log("✅ Price is available for this drug code");

    // Step 5: ตรวจสอบว่ามียาโค้ดเดียวกันหรือไม่
    const existingDrugsWithSameCode = await prisma.drug.findMany({
      where: {
        hospitalDrugCode: validatedData.hospitalDrugCode,
        isActive: true,
      },
      select: {
        id: true,
        pricePerBox: true,
        name: true,
      },
    });

    const isVariant = existingDrugsWithSameCode.length > 0;
    console.log("🔍 Is variant:", isVariant, "- Existing variants:", existingDrugsWithSameCode.length);

    // Step 6: Calculate initial values
    const initialTotalValue = validatedData.initialQuantity * validatedData.pricePerBox;
    console.log("🔍 Initial stock calculation:", {
      quantity: validatedData.initialQuantity,
      pricePerBox: validatedData.pricePerBox,
      totalValue: initialTotalValue,
      isVariant,
    });

    // Step 7: Start database transaction
    console.log("🔍 Starting database transaction...");
    const result = await prisma.$transaction(async (tx) => {
      console.log("🔍 Creating new drug record...");

      // ✅ FIXED: Create drug record with proper notes handling
      const drugData = {
        hospitalDrugCode: validatedData.hospitalDrugCode,
        name: validatedData.name,
        genericName: validatedData.genericName,
        dosageForm: validatedData.dosageForm,
        strength: validatedData.strength,
        unit: validatedData.unit,
        packageSize: validatedData.packageSize,
        pricePerBox: validatedData.pricePerBox,
        category: validatedData.category,
        notes: validatedData.notes, // ✅ ส่ง notes ลงไปใน database
        isActive: true,
      };

      console.log("🔍 Drug data to create:", JSON.stringify(drugData, null, 2));
      console.log("🔍 Notes value being saved:", JSON.stringify(drugData.notes));

      const newDrug = await tx.drug.create({
        data: drugData,
      });
      console.log("✅ Drug created with ID:", newDrug.id);
      console.log("✅ Drug notes saved:", JSON.stringify(newDrug.notes));

      // Create primary stock record
      console.log("🔍 Creating primary stock record for department:", validatedData.department);
      const primaryStock = await tx.stock.create({
        data: {
          drugId: newDrug.id,
          department: validatedData.department,
          totalQuantity: validatedData.initialQuantity,
          reservedQty: 0,
          minimumStock: validatedData.minimumStock,
          totalValue: initialTotalValue,
          lastUpdated: new Date(),
        },
      });
      console.log("✅ Primary stock created with ID:", primaryStock.id);

      // Create secondary stock record (opposite department)
      const secondaryDepartment = validatedData.department === "PHARMACY" ? "OPD" : "PHARMACY";
      console.log("🔍 Creating secondary stock record for department:", secondaryDepartment);

      const secondaryStock = await tx.stock.create({
        data: {
          drugId: newDrug.id,
          department: secondaryDepartment as Department,
          totalQuantity: 0,
          reservedQty: 0,
          minimumStock: 0,
          totalValue: 0,
          lastUpdated: new Date(),
        },
      });
      console.log("✅ Secondary stock created with ID:", secondaryStock.id);

      // Create initial transaction if there's initial quantity
      if (validatedData.initialQuantity > 0) {
        console.log("🔍 Creating initial stock transaction with user ID:", currentUser.userId);
        const transactionNote = isVariant
          ? `สร้างสต็อกเริ่มต้น - ${
              newDrug.name
            } (ราคา ื${validatedData.pricePerBox.toLocaleString()}) โดย ${
              currentUser.username
            }`
          : `สร้างสต็อกเริ่มต้น - ${newDrug.name} (โดย ${currentUser.username})`;

        const transaction = await tx.stockTransaction.create({
          data: {
            stockId: primaryStock.id,
            userId: currentUser.userId,
            type: "TRANSFER_IN",
            quantity: validatedData.initialQuantity,
            beforeQty: 0,
            afterQty: validatedData.initialQuantity,
            reference: `INITIAL_${newDrug.hospitalDrugCode}_${newDrug.id}`,
            note: transactionNote,
          },
        });
        console.log("✅ Initial transaction created with ID:", transaction.id);
      }

      // Return combined result
      const result = {
        id: primaryStock.id,
        drugId: newDrug.id,
        department: validatedData.department,
        totalQuantity: validatedData.initialQuantity,
        reservedQty: 0,
        minimumStock: validatedData.minimumStock,
        totalValue: initialTotalValue,
        lastUpdated: primaryStock.lastUpdated,
        drug: {
          id: newDrug.id,
          hospitalDrugCode: newDrug.hospitalDrugCode,
          name: newDrug.name,
          genericName: newDrug.genericName,
          dosageForm: newDrug.dosageForm,
          strength: newDrug.strength,
          unit: newDrug.unit,
          packageSize: newDrug.packageSize,
          category: newDrug.category,
          pricePerBox: newDrug.pricePerBox,
          notes: newDrug.notes, // ✅ รวม notes ใน response
          isActive: newDrug.isActive,
        },
        isVariant,
        variantCount: existingDrugsWithSameCode.length + 1,
      };

      console.log("✅ Transaction completed successfully");
      console.log("✅ Final result notes:", JSON.stringify(result.drug.notes));
      return result;
    });

    console.log("✅ POST /api/drugs - Success, returning result");

    const successMessage = result.isVariant
      ? `เพิ่มยา "${
          result.drug.name
        }" ราคา ฿${result.drug.pricePerBox.toLocaleString()} เรียบร้อยแล้ว (รายการที่ ${
          result.variantCount
        })`
      : `เพิ่มยา "${result.drug.name}" เรียบร้อยแล้ว`;

    return NextResponse.json({
      success: true,
      data: result,
      message: successMessage,
    });
  } catch (error) {
    console.error("❌ POST /api/drugs - Error occurred:");
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      console.error("❌ Zod validation errors:", error.issues);
      return NextResponse.json(
        {
          error: "ข้อมูลไม่ถูกต้อง",
          details: error.issues
            .map((issue: ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
          validationErrors: error.issues,
        },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("❌ Prisma error code:", error.code);
      console.error("❌ Prisma error meta:", error.meta);

      if (error.code === "P2002") {
        const target = error.meta?.target;

        if (
          target &&
          Array.isArray(target) &&
          target.includes("hospitalDrugCode") &&
          target.includes("pricePerBox")
        ) {
          return NextResponse.json(
            { error: "รหัสยาและราคานี้มีอยู่ในระบบแล้ว" },
            { status: 409 }
          );
        } else if (Array.isArray(target) && target[0] === "name") {
          return NextResponse.json(
            { error: "ชื่อยานี้มีอยู่ในระบบแล้ว" },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: "ข้อมูลซ้ำกับรายการที่มีอยู่แล้ว" },
          { status: 409 }
        );
      }

      if (error.code === "P2003") {
        console.error("❌ Foreign key constraint error");
        return NextResponse.json(
          {
            error: "ข้อผิดพลาดการเชื่อมโยงข้อมูล",
            details: "ไม่พบข้อมูลอ้างอิงที่จำเป็น กรุณาตรวจสอบข้อมูลผู้ใช้",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "ข้อผิดพลาดของฐานข้อมูล",
          details: `Prisma Error ${error.code}: ${error.message}`,
        },
        { status: 500 }
      );
    }

    // Generic error fallback
    console.error("❌ Unknown error:", error);
    return NextResponse.json(
      {
        error: "เกิดข้อผิดพลาดในการสร้างยาใหม่",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}