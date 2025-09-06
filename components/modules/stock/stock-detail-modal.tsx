// 📄 File: components/modules/stock/stock-detail-modal.tsx (Enhanced - เพิ่ม Code Validation)
// ✅ เพิ่มการตรวจสอบรหัสยาซ้ำเมื่อแก้ไขในส่วนข้อมูลยา

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Stock } from '@/types/dashboard'
import {
  calculateAvailableStock,
} from '@/lib/utils/dashboard'
import { 
  Package,
  Pill,
  Save,
  X,
  RotateCcw,
  Target,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react'

interface StockDetailModalProps {
  stock: Stock | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updatedStock: Stock) => void
}

interface StockUpdateData {
  totalQuantity: number
  minimumStock: number
  adjustmentReason: string
}

interface DrugUpdateData {
  hospitalDrugCode: string
  name: string
  genericName: string | null
  dosageForm: string
  strength: string | null
  unit: string
  packageSize: string | null
  pricePerBox: number
  category: string
  notes: string | null
}

// ✅ Interface สำหรับ Code Validation Result
interface CodeValidationResult {
  available: boolean
  exists: boolean
  canCreateVariant?: boolean
  drugs?: Array<{
    id: string
    name: string
    genericName: string | null
    pricePerBox: number
    category: string
  }>
  priceRange?: {
    min: number
    max: number
    count: number
  }
  suggestions?: Array<{
    hospitalDrugCode: string
    name: string
    pricePerBox?: number
  }>
  message?: string
}

interface CodeValidationState {
  isChecking: boolean
  result: CodeValidationResult | null
  error: string | null
}

// Quick adjustment options
const QUICK_ADJUSTMENTS = [
  { label: '+1', value: 1 },
  { label: '+5', value: 5 },
  { label: '+10', value: 10 },
  { label: '+50', value: 50 },
  { label: '-1', value: -1 },
  { label: '-5', value: -5 },
  { label: '-10', value: -10 },
  { label: '-50', value: -50 }
]

// Common adjustment reasons
const ADJUSTMENT_REASONS = [
  'นับสต็อก',
  'รับยาใหม่',
  'แก้ไขข้อมูล',
  'สูญหาย',
  'หมดอายุ',
  'เสียหาย',
  'ส่งคืน',
  'ปรับปรุงข้อมูล'
]

// Drug categories
const DRUG_CATEGORIES = [
  { value: 'GENERAL', label: 'ยาทั่วไป' },
  { value: 'TABLET', label: 'ยาเม็ด' },
  { value: 'SYRUP', label: 'ยาน้ำ' },
  { value: 'INJECTION', label: 'ยาฉีด' },
  { value: 'EXTEMP', label: 'ยาใช้ภายนอก/สมุนไพร' },
  { value: 'HAD', label: 'ยาเสี่ยงสูง' },
  { value: 'NARCOTIC', label: 'ยาเสพติด' },
  { value: 'PSYCHIATRIC', label: 'ยาจิตเวช' },
  { value: 'REFRIGERATED', label: 'ยาเย็น' },
  { value: 'FLUID', label: 'สารน้ำ' },
  { value: 'REFER', label: 'ยาส่งต่อ' },
  { value: 'ALERT', label: 'ยาเฝ้าระวัง' },
  { value: 'CANCELLED', label: "ยกเลิกการใช้" }
]

// Dosage forms
const DOSAGE_FORMS = [
  'TAB', 'CAP', 'SYR', 'SUS', 'INJ', 'SOL', 'OIN', 'GEL', 'LOT', 'SPR', 
  'SUP', 'ENE', 'POW', 'PWD', 'CR', 'BAG', 'APP', 'LVP', 'MDI', 'NAS', 
  'SAC', 'LIQ', 'MIX'
]

// ✅ ฟังก์ชันสำหรับสร้างเหตุผลอัตโนมัติ
const generateAdjustmentReason = (
  currentQty: number, 
  newQty: number, 
  currentMin: number, 
  newMin: number
): string => {
  const qtyChange = newQty - currentQty
  const minChange = newMin - currentMin

  if (qtyChange === 0) {
    if (minChange === 0) return 'อัพเดทข้อมูล'
    if (minChange > 0) return 'ปรับเพิ่มขั้นต่ำ'
    if (minChange < 0) return 'ปรับลดขั้นต่ำ'
  }
  
  if (qtyChange > 0) {
    return 'ปรับเพิ่มสต็อก'
  }
  
  if (qtyChange < 0) {
    return 'ปรับลดสต็อก'
  }

  return 'อัพเดทข้อมูล'
}

// ✅ Get stock status info
const getStockStatusInfo = (stock: Stock) => {
  const availableStock = calculateAvailableStock(stock)
  const isLow = stock.totalQuantity < stock.minimumStock && stock.minimumStock > 0
  
  if (isLow) {
    return {
      label: 'สต็อกต่ำ',
      color: 'bg-red-100 text-red-800 border-red-200',
      description: 'สต็อกคงเหลือต่ำกว่าจำนวนขั้นต่ำ ต้องเติมสต็อก'
    }
  } else if (stock.minimumStock === 0) {
    return {
      label: 'ไม่ได้ใช้งาน',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      description: 'ยาไม่ได้กำหนดระดับขั้นต่ำ อาจไม่ได้ใช้งาน'
    }
  } else if (availableStock > stock.minimumStock * 2) {
    return {
      label: 'สต็อกเพียงพอ',
      color: 'bg-green-100 text-green-800 border-green-200',
      description: 'สต็อกคงเหลือเพียงพอ'
    }
  } else {
    return {
      label: 'สต็อกปานกลาง',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      description: 'สต็อกใกล้ขั้นต่ำ ควรติดตาม'
    }
  }
}

// ✅ Custom hook สำหรับ debounced code validation
const useCodeValidation = (
  code: string, 
  currentDrugId: string, 
  delay: number = 800
) => {
  const [validationState, setValidationState] = useState<CodeValidationState>({
    isChecking: false,
    result: null,
    error: null
  })

  const [debouncedCode, setDebouncedCode] = useState(code)

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code.trim())
    }, delay)

    return () => clearTimeout(timer)
  }, [code, delay])

  // Validation effect
  useEffect(() => {
    const validateCode = async (codeToCheck: string) => {
      // ถ้าเป็นรหัสเดิม ไม่ต้องเช็ค
      if (!codeToCheck || codeToCheck === '') {
        setValidationState({
          isChecking: false,
          result: null,
          error: null
        })
        return
      }

      setValidationState(prev => ({
        ...prev,
        isChecking: true,
        error: null
      }))

      try {
        const response = await fetch(
          `/api/drugs/check-code?code=${encodeURIComponent(codeToCheck)}`
        )

        if (!response.ok) {
          throw new Error('Failed to validate code')
        }

        const result: CodeValidationResult = await response.json()
        
        // ✅ ตรวจสอบว่ารหัสนี้ถูกใช้โดยยาตัวอื่นหรือไม่
        if (result.exists && result.drugs) {
          // กรองออกยาที่เป็นตัวปัจจุบัน (เพื่อไม่ให้แสดงตัวเองเป็น duplicate)
          const otherDrugs = result.drugs.filter(drug => drug.id !== currentDrugId)
          
          if (otherDrugs.length > 0) {
            // มียาอื่นใช้รหัสนี้อยู่แล้ว
            setValidationState({
              isChecking: false,
              result: {
                ...result,
                drugs: otherDrugs,
                available: false, // ✅ ไม่สามารถใช้ได้เพราะมียาอื่นใช้แล้ว
                message: `รหัส "${codeToCheck}" ถูกใช้งานแล้วโดยยาอื่น (${otherDrugs.length} รายการ)`
              },
              error: null
            })
          } else {
            // ไม่มียาอื่นใช้รหัสนี้ (แค่ตัวปัจจุบัน)
            setValidationState({
              isChecking: false,
              result: {
                ...result,
                available: true,
                message: `รหัส "${codeToCheck}" ใช้ได้ (รหัสปัจจุบัน)`
              },
              error: null
            })
          }
        } else {
          // ไม่มียาใช้รหัสนี้ = ใช้ได้
          setValidationState({
            isChecking: false,
            result: {
              ...result,
              available: true,
              message: `รหัส "${codeToCheck}" ใช้ได้ (รหัสใหม่)`
            },
            error: null
          })
        }

      } catch (error) {
        console.error('Code validation error:', error)
        setValidationState({
          isChecking: false,
          result: null,
          error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัส'
        })
      }
    }

    if (debouncedCode) {
      validateCode(debouncedCode)
    } else {
      setValidationState({
        isChecking: false,
        result: null,
        error: null
      })
    }
  }, [debouncedCode, currentDrugId])

  return validationState
}

// ✅ Code Validation Status Component
const CodeValidationStatus = ({ validationState }: { 
  validationState: CodeValidationState
  originalCode: string
}) => {
  const { isChecking, result, error } = validationState

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm text-blue-700">กำลังตรวจสอบรหัส...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-sm text-red-700">{error}</span>
      </div>
    )
  }

  if (result) {
    if (result.available) {
      return (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">{result.message}</span>
        </div>
      )
    } else {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{result.message}</span>
          </div>
          
          {/* แสดงรายการยาที่ใช้รหัสนี้แล้ว */}
          {result.drugs && result.drugs.length > 0 && (
            <div className="p-2 bg-orange-50 rounded-lg">
              <div className="text-sm font-medium text-orange-800 mb-1">
                ยาที่ใช้รหัสนี้แล้ว:
              </div>
              {result.drugs.map((drug, index) => (
                <div key={drug.id} className="text-xs text-orange-700">
                  {index + 1}. {drug.name} ({drug.genericName || 'N/A'}) - กล่องละ {drug.pricePerBox.toFixed(2)} ฿
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
  }

  return null
}

export function StockDetailModalEnhanced({ 
  stock, 
  isOpen, 
  onClose, 
  onUpdate 
}: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'stock' | 'drug'>('stock')
  const [loading, setLoading] = useState(false)
  
  // Stock data states
  const [stockFormData, setStockFormData] = useState<StockUpdateData>({
    totalQuantity: 0,
    minimumStock: 0,
    adjustmentReason: 'อัพเดทข้อมูล'
  })

  // Drug data states  
  const [drugFormData, setDrugFormData] = useState<DrugUpdateData>({
    hospitalDrugCode: '',
    name: '',
    genericName: null,
    dosageForm: '',
    strength: null,
    unit: '',
    packageSize: null,
    pricePerBox: 0,
    category: 'GENERAL',
    notes: null
  })

  // ✅ Code validation state
  const codeValidation = useCodeValidation(
    drugFormData.hospitalDrugCode, 
    stock?.drugId || '', 
    800
  )

  // Reset form เมื่อเปิด modal ใหม่
  useEffect(() => {
    if (stock && isOpen) {
      setStockFormData({
        totalQuantity: stock.totalQuantity,
        minimumStock: stock.minimumStock,
        adjustmentReason: 'อัพเดทข้อมูล'
      })
      
      setDrugFormData({
        hospitalDrugCode: stock.drug.hospitalDrugCode,
        name: stock.drug.name,
        genericName: stock.drug.genericName || null,
        dosageForm: stock.drug.dosageForm,
        strength: stock.drug.strength || null,
        unit: stock.drug.unit,
        packageSize: stock.drug.packageSize || null,
        pricePerBox: stock.drug.pricePerBox,
        category: stock.drug.category,
        notes: stock.drug.notes || null
      })

      setActiveTab('stock')
    }
  }, [stock, isOpen])

  // อัปเดตเหตุผลอัตโนมัติเมื่อมีการเปลี่ยนแปลงข้อมูล
  useEffect(() => {
    if (stock) {
      const autoReason = generateAdjustmentReason(
        stock.totalQuantity,
        stockFormData.totalQuantity,
        stock.minimumStock,
        stockFormData.minimumStock
      )
      
      setStockFormData(prev => ({
        ...prev,
        adjustmentReason: autoReason
      }))
    }
  }, [stock, stockFormData.totalQuantity, stockFormData.minimumStock])

  if (!stock) return null

  const stockStatusInfo = getStockStatusInfo(stock)

  // Quick stock adjustment handlers
  const handleQuickAdjustment = (delta: number) => {
    const newQuantity = Math.max(0, stockFormData.totalQuantity + delta)
    setStockFormData(prev => ({
      ...prev,
      totalQuantity: newQuantity
    }))
  }

  const handleSetMinimumStock = () => {
    setStockFormData(prev => ({
      ...prev,
      minimumStock: prev.totalQuantity
    }))
  }

  const handleResetStock = () => {
    setStockFormData({
      totalQuantity: stock.totalQuantity,
      minimumStock: stock.minimumStock,
      adjustmentReason: 'อัพเดทข้อมูล'
    })
  }

  // Save stock changes
  const handleSaveStock = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stocks/${stock.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          totalQuantity: stockFormData.totalQuantity,
          minimumStock: stockFormData.minimumStock,
          adjustmentReason: stockFormData.adjustmentReason,
          department: stock.department
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการอัปเดต')
      }

      const { data: updatedStock, message } = await response.json()

      toast.success('บันทึกสต็อกสำเร็จ!', {
        description: message || "ข้อมูลสต็อกถูกอัปเดตเรียบร้อยแล้ว"
      })

      onUpdate?.(updatedStock)
      onClose()
      
    } catch (error) {
      console.error('Error updating stock:', error)
      toast.error('เกิดข้อผิดพลาด!', {
        description: error instanceof Error ? error.message : 'ไม่สามารถอัปเดตข้อมูลได้'
      })
    } finally {
      setLoading(false)
    }
  }

  // Save drug changes
  const handleSaveDrug = async () => {
    // ✅ ตรวจสอบการ validation รหัสยาก่อนบันทึก
    if (!codeValidation.result?.available && drugFormData.hospitalDrugCode !== stock.drug.hospitalDrugCode) {
      toast.error('ไม่สามารถบันทึกได้!', {
        description: 'รหัสยาที่ระบุถูกใช้งานโดยยาอื่นแล้ว'
      })
      return
    }

    if (!drugFormData.name.trim()) {
      toast.error('กรุณาระบุชื่อยา', {
        description: "ชื่อยาเป็นข้อมูลที่จำเป็น"
      })
      return
    }

    if (!drugFormData.hospitalDrugCode.trim()) {
      toast.error('กรุณาระบุรหัสยา', {
        description: "รหัสยาโรงพยาบาลเป็นข้อมูลที่จำเป็น"
      })
      return
    }

    if (!drugFormData.unit.trim()) {
      toast.error('กรุณาระบุหน่วย', {
        description: "หน่วยเป็นข้อมูลที่จำเป็น"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/drugs/${stock.drugId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(drugFormData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการอัปเดต')
      }

      const { data: updatedDrug, priceChanged, oldPrice, newPrice } = await response.json()

      let toastDescription = "ข้อมูลยาถูกอัปเดตเรียบร้อยแล้ว"
      if (priceChanged) {
        toastDescription += `\nราคาเปลี่ยนจาก ฿${oldPrice?.toFixed(2)} เป็น ฿${newPrice?.toFixed(2)}`
      }

      toast.success('บันทึกข้อมูลยาสำเร็จ!', {
        description: toastDescription
      })

      const updatedStock = { 
        ...stock, 
        drug: {
          ...updatedDrug,
          hospitalDrugCode: updatedDrug.hospitalDrugCode,
          name: updatedDrug.name,
          genericName: updatedDrug.genericName,
          dosageForm: updatedDrug.dosageForm,
          strength: updatedDrug.strength,
          unit: updatedDrug.unit,
          packageSize: updatedDrug.packageSize,
          pricePerBox: updatedDrug.pricePerBox,
          category: updatedDrug.category,
          isActive: updatedDrug.isActive,
          notes: updatedDrug.notes
        },
        ...(priceChanged && {
          totalValue: stock.totalQuantity * newPrice
        })
      }
      
      onUpdate?.(updatedStock)
      onClose()
      
    } catch (error) {
      console.error('Error updating drug:', error)
      toast.error('เกิดข้อผิดพลาด!', {
        description: error instanceof Error ? error.message : 'ไม่สามารถอัปเดตข้อมูลได้',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  // Check for drug changes
  const hasDrugChanges = drugFormData.hospitalDrugCode !== stock.drug.hospitalDrugCode ||
                        drugFormData.name !== stock.drug.name ||
                        drugFormData.genericName !== stock.drug.genericName ||
                        drugFormData.dosageForm !== stock.drug.dosageForm ||
                        drugFormData.strength !== stock.drug.strength ||
                        drugFormData.unit !== stock.drug.unit ||
                        drugFormData.packageSize !== stock.drug.packageSize ||
                        drugFormData.pricePerBox !== stock.drug.pricePerBox ||
                        drugFormData.category !== stock.drug.category ||
                        drugFormData.notes !== stock.drug.notes

  // ✅ Check if code is being validated and not available (สำหรับ disable save button)
  const isCodeInvalid = codeValidation.result && 
                       !codeValidation.result.available && 
                       drugFormData.hospitalDrugCode !== stock.drug.hospitalDrugCode

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            จัดการข้อมูลยา
          </DialogTitle>
        </DialogHeader>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'stock' | 'drug')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stock" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              จัดการสต็อก
            </TabsTrigger>
            <TabsTrigger value="drug" className="flex items-center gap-2">
              <Pill className="h-4 w-4" />
              ข้อมูลยา
            </TabsTrigger>
          </TabsList>

          {/* Stock Management Tab */}
          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    ปรับสต็อก
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="text-sm font-medium text-blue-600">
                        {stock.minimumStock.toLocaleString()}
                      </div>
                      <span className="text-xs text-gray-500">ขั้นต่ำ</span>
                    </div>
                    <Badge className={stockStatusInfo.color}>
                      {stockStatusInfo.label}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stockFormData.totalQuantity.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">จำนวนปัจจุบัน</div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {QUICK_ADJUSTMENTS.map((adj) => (
                    <Button
                      key={adj.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjustment(adj.value)}
                      className={`${adj.value > 0 ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                    >
                      {adj.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">ระบุจำนวนสต็อกปัจจุบัน</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={stockFormData.totalQuantity}
                      onChange={(e) => setStockFormData(prev => ({
                        ...prev,
                        totalQuantity: Math.max(0, parseInt(e.target.value) || 0)
                      }))}
                      className="text-center text-lg font-medium"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleResetStock}
                      title="รีเซ็ต"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-sm font-medium">จำนวนขั้นต่ำ</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={stockFormData.minimumStock}
                      onChange={(e) => setStockFormData(prev => ({
                        ...prev,
                        minimumStock: Math.max(0, parseInt(e.target.value) || 0)
                      }))}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSetMinimumStock}
                      className="shrink-0"
                    >
                      ใช้ปัจจุบัน
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">เหตุผล</label>
                  <div className="flex gap-2">
                    <Input
                      value={stockFormData.adjustmentReason}
                      onChange={(e) => setStockFormData(prev => ({ ...prev, adjustmentReason: e.target.value }))}
                      placeholder="ระบุเหตุผลการปรับสต็อก"
                      className="flex-1"
                    />
                    <Select
                      value={stockFormData.adjustmentReason}
                      onValueChange={(value) => setStockFormData(prev => ({ ...prev, adjustmentReason: value }))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="เลือก" />
                      </SelectTrigger>
                      <SelectContent>
                        {ADJUSTMENT_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-500">
                    เหตุผลถูกสร้างอัตโนมัติตามการเปลี่ยนแปลง สามารถแก้ไข/พิมพ์เองได้
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                กลับ
              </Button>
              <Button
                onClick={handleSaveStock}
                disabled={loading}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'กำลังอัพเดท...' : 'อัพเดท'}
              </Button>
            </div>
          </TabsContent>

          {/* Drug Information Tab */}
          <TabsContent value="drug" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  ข้อมูลยา
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ✅ รหัสยาโรงพยาบาล พร้อม Code Validation */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">รหัสยาโรงพยาบาล *</label>
                    <Input
                      value={drugFormData.hospitalDrugCode}
                      onChange={(e) => setDrugFormData(prev => ({ 
                        ...prev, 
                        hospitalDrugCode: e.target.value.toUpperCase() 
                      }))}
                      placeholder="ระบุรหัสยา"
                      className={`${isCodeInvalid ? 'border-red-500 focus:border-red-500' : ''}`}
                      style={{ textTransform: 'uppercase' }}
                    />
                    
                    {/* ✅ แสดงสถานะการตรวจสอบรหัส */}
                    {drugFormData.hospitalDrugCode && drugFormData.hospitalDrugCode !== stock.drug.hospitalDrugCode && (
                      <CodeValidationStatus 
                        validationState={codeValidation} 
                        originalCode={stock.drug.hospitalDrugCode}
                      />
                    )}
                    
                    {/* แสดงรหัสเดิม */}
                    {drugFormData.hospitalDrugCode !== stock.drug.hospitalDrugCode && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Info className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">
                          รหัสเดิม: <span className="font-medium">{stock.drug.hospitalDrugCode}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">ชื่อยา *</label>
                    <Input
                      value={drugFormData.name}
                      onChange={(e) => setDrugFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ระบุชื่อยา"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">ชื่อสามัญ</label>
                    <Input
                      value={drugFormData.genericName || ''}
                      onChange={(e) => setDrugFormData(prev => ({ ...prev, genericName: e.target.value || null }))}
                      placeholder="ระบุชื่อสามัญ"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">รูปแบบยา</label>
                    <Select
                      value={drugFormData.dosageForm}
                      onValueChange={(value) => setDrugFormData(prev => ({ ...prev, dosageForm: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกรูปแบบ" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOSAGE_FORMS.map((form) => (
                          <SelectItem key={form} value={form}>
                            {form}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">ความแรง หรือ ปริมาตร</label>
                    <Input
                      value={drugFormData.strength || ''}
                      onChange={(e) => setDrugFormData(prev => ({ ...prev, strength: e.target.value || null }))}
                      placeholder="เช่น 500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">หน่วยความแรง หรือ ปริมาตร *</label>
                    <Input
                      value={drugFormData.unit}
                      onChange={(e) => setDrugFormData(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="เช่น mg, ml, tab"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">ขนาดบรรจุ</label>
                    <Input
                      value={drugFormData.packageSize || ''}
                      onChange={(e) => setDrugFormData(prev => ({ ...prev, packageSize: e.target.value || null }))}
                      placeholder="เช่น 100"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">ราคาต่อกล่อง (บาท)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={drugFormData.pricePerBox}
                      onChange={(e) => setDrugFormData(prev => ({ ...prev, pricePerBox: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">ประเภทยา</label>
                  <Select
                    value={drugFormData.category}
                    onValueChange={(value) => setDrugFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRUG_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">หมายเหตุ</label>
                  <Textarea
                    value={drugFormData.notes || ''}
                    onChange={(e) => setDrugFormData(prev => ({ ...prev, notes: e.target.value || null }))}
                    placeholder="หมายเหตุเพิ่มเติม..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons for Drug */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                กลับ
              </Button>
              <Button
                onClick={handleSaveDrug}
                disabled={
                  loading || 
                  !hasDrugChanges || 
                  !drugFormData.name.trim() || 
                  !drugFormData.hospitalDrugCode.trim() || 
                  !drugFormData.unit.trim() ||
                  isCodeInvalid || 
                  codeValidation.isChecking
                }
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'กำลังบันทึก...' : 
                 codeValidation.isChecking ? 'กำลังตรวจสอบ...' : 'บันทึก'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div>
              อัปเดตล่าสุด: {stock.lastUpdated ? new Date(stock.lastUpdated).toLocaleString('th-TH') : '-'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4 text-red-600" />
              <p className='text-red-600'>ปิด</p>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}