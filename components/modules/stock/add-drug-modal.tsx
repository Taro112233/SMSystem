// 📄 File: components/modules/stock/add-drug-modal.tsx (FIXED - Removed unused variable)
// ✅ แก้ไข TypeScript warning โดยลบ unused variable drugType

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stock } from "@/types/dashboard";
import { useDrugCodeValidation } from "@/hooks/use-drug-code-validation";
import {
  Package,
  Pill,
  Save,
  X,
  RotateCcw,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Copy,
  DollarSign,
  Info,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

interface AddDrugModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDrugAdded?: (newStock: Stock) => void;
  department: "PHARMACY" | "OPD";
}

interface NewDrugData {
  hospitalDrugCode: string;
  name: string;
  genericName: string | null;
  dosageForm: string;
  strength: string | null;
  unit: string;
  packageSize: string | null;
  pricePerBox: number;
  category: string;
  notes: string | null;
  initialQuantity: number;
  minimumStock: number;
}

// Drug categories และ dosage forms
const DRUG_CATEGORIES = [
  { value: "GENERAL", label: "ยาทั่วไป" },
  { value: "TABLET", label: "ยาเม็ด" },
  { value: "SYRUP", label: "ยาน้ำ" },
  { value: "INJECTION", label: "ยาฉีด" },
  { value: "EXTEMP", label: "ยาใช้ภายนอก/สมุนไพร" },
  { value: "HAD", label: "ยาเสี่ยงสูง" },
  { value: "NARCOTIC", label: "ยาเสพติด" },
  { value: "PSYCHIATRIC", label: "ยาจิตเวช" },
  { value: "REFRIGERATED", label: "ยาเย็น" },
  { value: "FLUID", label: "สารน้ำ" },
  { value: "REFER", label: "ยาส่งต่อ" },
  { value: "ALERT", label: "ยาเฝ้าระวัง" },
  { value: "CANCELLED", label: "ยกเลิกการใช้" },
];

const DOSAGE_FORMS = [
  "TAB", "CAP", "SYR", "SUS", "INJ", "SOL", "OIN", "GEL", "LOT", "SPR", 
  "SUP", "ENE", "POW", "PWD", "CR", "BAG", "APP", "LVP", "MDI", "NAS", 
  "SAC", "LIQ", "MIX"
];

// Initial form data
const initialFormData: NewDrugData = {
  hospitalDrugCode: "",
  name: "",
  genericName: null,
  dosageForm: "TAB",
  strength: null,
  unit: "",
  packageSize: null,
  pricePerBox: 0,
  category: "GENERAL",
  notes: null,
  initialQuantity: 0,
  minimumStock: 10,
};

export function AddDrugModal({
  isOpen,
  onClose,
  onDrugAdded,
  department,
}: AddDrugModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NewDrugData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ Updated validation hook
  const {
    code: drugCode,
    isChecking,
    isAvailable,
    hasExistingVariants,
    existingDrugs,
    templateDrug,
    error: validationError,
    updateCode,
    getValidationStatus,
    getMessage,
    getVariantSummary,
    getSuggestedNextPrice,
  } = useDrugCodeValidation(formData.hospitalDrugCode);

  // ✅ State สำหรับ variant mode และ data backup
  const [isVariantMode, setIsVariantMode] = useState(false);
  const [showExistingVariants, setShowExistingVariants] = useState(false);
  const [userBackupData, setUserBackupData] = useState<NewDrugData | null>(null);
  
  // ✅ ใช้ ref เพื่อ track ว่าเคยทำ auto-fill แล้วหรือยัง
  const autoFilledCodeRef = useRef<string>("");

  // Handle drug code change
  const handleDrugCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase();
    setFormData((prev) => ({ ...prev, hospitalDrugCode: newCode }));
    updateCode(newCode);

    if (errors.hospitalDrugCode) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.hospitalDrugCode;
        return newErrors;
      });
    }
  };

  // ✅ ฟังก์ชัน backup ข้อมูลผู้ใช้
  const backupUserData = useCallback(() => {
    console.log("🔄 Backing up user data");
    setUserBackupData({ ...formData });
  }, [formData]);

  // ✅ ฟังก์ชัน restore ข้อมูลผู้ใช้
  const restoreUserData = useCallback(() => {
    if (userBackupData) {
      console.log("🔄 Restoring user data");
      const restoredData = {
        ...userBackupData,
        hospitalDrugCode: formData.hospitalDrugCode, // เก็บรหัสปัจจุบัน
      };
      setFormData(restoredData);
      setUserBackupData(null);
      setIsVariantMode(false);
      autoFilledCodeRef.current = "";
    }
  }, [userBackupData, formData.hospitalDrugCode]);

  // ✅ ฟังก์ชัน auto-fill จาก template
  const autoFillFromTemplate = useCallback(() => {
    if (!templateDrug) return;
    
    console.log("🔄 Auto-filling from template");
    const filledData: NewDrugData = {
      hospitalDrugCode: formData.hospitalDrugCode,
      name: templateDrug.name,
      genericName: templateDrug.genericName,
      dosageForm: templateDrug.dosageForm,
      strength: templateDrug.strength,
      unit: templateDrug.unit,
      packageSize: templateDrug.packageSize,
      pricePerBox: getSuggestedNextPrice() || templateDrug.pricePerBox,
      category: templateDrug.category,
      notes: null,
      initialQuantity: 0,
      minimumStock: 10,
    };

    setFormData(filledData);
    setIsVariantMode(true);
    autoFilledCodeRef.current = formData.hospitalDrugCode;
    setErrors({});
  }, [templateDrug, formData.hospitalDrugCode, getSuggestedNextPrice]);

  // ✅ Effect สำหรับจัดการ variant mode
  useEffect(() => {
    const currentCode = drugCode.trim();
    const hasVariants = hasExistingVariants && templateDrug;
    const isCurrentCodeAutoFilled = autoFilledCodeRef.current === currentCode;

    console.log("🔍 Variant Effect:", {
      currentCode,
      hasVariants,
      isCurrentCodeAutoFilled,
      isVariantMode,
      hasBackup: !!userBackupData
    });

    if (hasVariants && currentCode && !isCurrentCodeAutoFilled) {
      // เข้าสู่ variant mode
      console.log("➡️ Entering variant mode");
      backupUserData();
      autoFillFromTemplate();
      
      toast.info("พบยารายการเดียวกัน", {
        description: "ระบบได้ใส่ข้อมูลยาให้แล้ว กรุณาระบุราคาใหม่",
        icon: <Copy className="w-4 h-4" />,
        duration: 4000,
      });
    } else if (!hasVariants && isVariantMode && userBackupData) {
      // ออกจาก variant mode
      console.log("⬅️ Exiting variant mode");
      restoreUserData();
    }
  }, [
    drugCode,
    hasExistingVariants,
    templateDrug,
    isVariantMode,
    userBackupData,
    backupUserData,
    autoFillFromTemplate,
    restoreUserData
  ]);

  // Reset form when modal opens/closes
  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    setIsVariantMode(false);
    setShowExistingVariants(false);
    setUserBackupData(null);
    autoFilledCodeRef.current = "";
    updateCode("");
    onClose();
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
    setIsVariantMode(false);
    setShowExistingVariants(false);
    setUserBackupData(null);
    autoFilledCodeRef.current = "";
    updateCode("");
    toast.info("รีเซ็ตฟอร์มแล้ว", {
      description: "ข้อมูลทั้งหมดถูกล้างเรียบร้อยแล้ว",
      icon: <RotateCcw className="w-4 h-4" />,
      duration: 2000,
    });
  };

  // Enhanced validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let firstErrorField = "";

    if (!formData.hospitalDrugCode.trim()) {
      newErrors.hospitalDrugCode = "รหัสยาโรงพยาบาลเป็นข้อมูลที่จำเป็น";
      if (!firstErrorField) firstErrorField = "hospitalDrugCode";
    } else if (validationError) {
      newErrors.hospitalDrugCode = "ไม่สามารถตรวจสอบรหัสได้";
      if (!firstErrorField) firstErrorField = "hospitalDrugCode";
    }

    if (!formData.name.trim()) {
      newErrors.name = "ชื่อยาเป็นข้อมูลที่จำเป็น";
      if (!firstErrorField) firstErrorField = "name";
    }

    if (!formData.unit.trim()) {
      newErrors.unit = "หน่วยเป็นข้อมูลที่จำเป็น";
      if (!firstErrorField) firstErrorField = "unit";
    }

    if (formData.pricePerBox < 0) {
      newErrors.pricePerBox = "ราคาต้องไม่น้อยกว่า 0";
      if (!firstErrorField) firstErrorField = "pricePerBox";
    }

    // ✅ เช็คราคาซ้ำในกรณี variant mode
    if (isVariantMode && existingDrugs.length > 0) {
      const existingPrice = existingDrugs.find(d => d.pricePerBox === formData.pricePerBox);
      if (existingPrice) {
        newErrors.pricePerBox = `ราคา ฿${formData.pricePerBox.toLocaleString()} มีอยู่แล้ว`;
        if (!firstErrorField) firstErrorField = "pricePerBox";
      }
    }

    if (formData.initialQuantity < 0) {
      newErrors.initialQuantity = "จำนวนเริ่มต้นต้องไม่น้อยกว่า 0";
      if (!firstErrorField) firstErrorField = "initialQuantity";
    }

    if (formData.minimumStock < 0) {
      newErrors.minimumStock = "จำนวนขั้นต่ำต้องไม่น้อยกว่า 0";
      if (!firstErrorField) firstErrorField = "minimumStock";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const errorCount = Object.keys(newErrors).length;
      const firstError = newErrors[firstErrorField];

      toast.error("ข้อมูลไม่ถูกต้อง", {
        description:
          errorCount === 1
            ? firstError
            : `พบข้อผิดพลาด ${errorCount} รายการ โปรดตรวจสอบข้อมูล`,
        icon: <AlertTriangle className="w-4 h-4" />,
        duration: 5000,
      });

      return false;
    }

    return true;
  };

  // ✅ Enhanced submit - ลบ unused variable drugType
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // ✅ ลบบรรทัดนี้ออกเพราะไม่ได้ใช้งาน
    // const drugType = isVariantMode ? "variant" : "new";
    
    const progressToast = toast.loading(
      isVariantMode ? "กำลังเพิ่มยาราคาใหม่..." : "กำลังเพิ่มยาใหม่...",
      {
        description: `เพิ่ม "${formData.name}" (${formData.hospitalDrugCode}) ราคา ฿${formData.pricePerBox.toLocaleString()} ไปยัง ${department === "PHARMACY" ? "คลังยา" : "OPD"}`,
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
      }
    );

    setLoading(true);

    try {
      const response = await fetch("/api/drugs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          department,
        }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error("❌ Failed to parse response JSON:", parseError);

        toast.dismiss(progressToast);
        toast.error("ข้อผิดพลาดในการตอบสนอง", {
          description: "เซิร์ฟเวอร์ตอบกลับข้อมูลที่ไม่ถูกต้อง",
          icon: <XCircle className="w-4 h-4" />,
          duration: 6000,
        });
        return;
      }

      if (!response.ok) {
        toast.dismiss(progressToast);

        switch (response.status) {
          case 409:
            toast.error("ข้อมูลซ้ำ!", {
              description: responseData?.error || "มีข้อมูลซ้ำในระบบ",
              icon: <AlertCircle className="w-4 h-4" />,
              duration: 5000,
            });
            return;

          case 400:
            toast.error("ข้อมูลไม่ถูกต้อง", {
              description: responseData?.error || "โปรดตรวจสอบข้อมูลที่กรอก",
              icon: <AlertTriangle className="w-4 h-4" />,
              duration: 6000,
            });
            return;

          case 500:
            toast.error("ข้อผิดพลาดของเซิร์ฟเวอร์", {
              description: "โปรดลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ",
              icon: <XCircle className="w-4 h-4" />,
              duration: 6000,
              action: {
                label: "ลองอีกครั้ง",
                onClick: () => handleSubmit(),
              },
            });
            return;

          default:
            toast.error(`ข้อผิดพลาด (${response.status})`, {
              description: responseData?.error || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ",
              icon: <XCircle className="w-4 h-4" />,
              duration: 6000,
            });
            return;
        }
      }

      const { data: newStock } = responseData;

      toast.dismiss(progressToast);
      
      if (isVariantMode) {
        toast.success("เพิ่มยาราคาใหม่สำเร็จ!", {
          description: `เพิ่ม "${formData.name}" ราคา ฿${formData.pricePerBox.toLocaleString()} เรียบร้อยแล้ว`,
          duration: 4000,
        });
      } else {
        toast.success("เพิ่มยาใหม่สำเร็จ!", {
          description: `เพิ่ม "${formData.name}" (${formData.hospitalDrugCode}) เรียบร้อยแล้ว`,
          duration: 4000,
        });
      }

      if (formData.initialQuantity > 0) {
        setTimeout(() => {
          toast.info("ข้อมูลสต็อกเริ่มต้น", {
            description: `จำนวน ${formData.initialQuantity} หน่วย มูลค่า ฿${(
              formData.initialQuantity * formData.pricePerBox
            ).toLocaleString()}`,
            icon: <Package className="w-4 h-4" />,
            duration: 3000,
          });
        }, 500);
      }

      onDrugAdded?.(newStock);
      handleClose();
    } catch (error) {
      console.error("❌ Add drug error:", error);

      toast.dismiss(progressToast);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("ไม่สามารถเชื่อมต่อได้", {
          description: "โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต และลองใหม่อีกครั้ง",
          icon: <XCircle className="w-4 h-4" />,
          duration: 8000,
          action: {
            label: "ลองอีกครั้ง",
            onClick: () => handleSubmit(),
          },
        });
      } else {
        toast.error("เกิดข้อผิดพลาด", {
          description: "ไม่สามารถเพิ่มยาได้ โปรดลองใหม่อีกครั้ง",
          icon: <XCircle className="w-4 h-4" />,
          duration: 6000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for form inputs
  const handleInputChange = <K extends keyof NewDrugData>(
    field: K,
    value: NewDrugData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleStringInputChange =
    (field: keyof NewDrugData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (
        field === "genericName" ||
        field === "strength" ||
        field === "packageSize" ||
        field === "notes"
      ) {
        handleInputChange(field, value || null);
      } else {
        handleInputChange(field, value as NewDrugData[typeof field]);
      }
    };

  const handleNumberInputChange =
    (field: "pricePerBox" | "initialQuantity" | "minimumStock") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value) || 0;
      handleInputChange(field, Math.max(0, value));
    };

  // Get validation status icon
  const getValidationIcon = () => {
    const status = getValidationStatus();
    switch (status) {
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "available":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "variants":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const hasFormData = Object.keys(formData).some((key) => {
    const value = formData[key as keyof NewDrugData];
    if (key === "dosageForm" && value === "TAB") return false;
    if (key === "category" && value === "GENERAL") return false;
    if (key === "minimumStock" && value === 10) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return value > 0;
    return value !== null;
  });

  const canSubmit =
    !loading &&
    !isChecking &&
    formData.hospitalDrugCode.trim() !== "" &&
    formData.name.trim() !== "" &&
    formData.unit.trim() !== "" &&
    isAvailable;

  const variantSummary = getVariantSummary();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            {isVariantMode ? "เพิ่มยาราคาใหม่" : "เพิ่มยาใหม่"} - {department === "PHARMACY" ? "คลังยา" : "OPD"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Variant Information Display */}
          {isVariantMode && variantSummary && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <ShoppingCart className="h-4 w-4" />
                  ข้อมูลยาที่มีอยู่
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExistingVariants(!showExistingVariants)}
                    className="ml-auto text-blue-600 hover:text-blue-800"
                  >
                    {showExistingVariants ? "ซ่อน" : "แสดง"} ({variantSummary.count} รายการ)
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-blue-600 font-medium">จำนวนราคา</div>
                    <div className="text-blue-800">{variantSummary.count} ราคา</div>
                  </div>
                  <div>
                    <div className="text-blue-600 font-medium">ช่วงราคา</div>
                    <div className="text-blue-800">
                      ฿{variantSummary.priceRange?.min.toLocaleString()} - ฿{variantSummary.priceRange?.max.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600 font-medium">ราคาเฉลี่ย</div>
                    <div className="text-blue-800">฿{variantSummary.averagePrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-blue-600 font-medium">ราคาล่าสุด</div>
                    <div className="text-blue-800">฿{variantSummary.latestPrice.toLocaleString()}</div>
                  </div>
                </div>

                {showExistingVariants && existingDrugs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-blue-800 border-b border-blue-200 pb-1">
                      รายการราคาที่มีอยู่:
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {existingDrugs.map((drug, index) => (
                        <div key={drug.id} className="flex justify-between items-center text-xs bg-white/60 rounded p-2">
                          <span>
                            #{index + 1} - ฿{drug.pricePerBox.toLocaleString()}
                          </span>
                          <span className="text-blue-600">
                            {new Date(drug.createdAt).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Drug Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4" />
                ข้อมูลยา
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* รหัสยาโรงพยาบาล with Real-time Validation */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    รหัสยาโรงพยาบาล *{getValidationIcon()}
                  </label>
                  <div className="relative">
                    <Input
                      name="hospitalDrugCode"
                      value={formData.hospitalDrugCode}
                      onChange={handleDrugCodeChange}
                      placeholder="ระบุรหัสยา (เช่น TAB001)"
                      className={`${
                        errors.hospitalDrugCode
                          ? "border-red-500"
                          : isAvailable
                          ? hasExistingVariants
                            ? "border-blue-500"
                            : "border-green-500"
                          : ""
                      } ${isChecking ? "pr-8" : ""}`}
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>
                  {errors.hospitalDrugCode && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.hospitalDrugCode}
                    </p>
                  )}
                  {getMessage() && !errors.hospitalDrugCode && (
                    <p className={`text-sm flex items-center gap-1 ${
                      hasExistingVariants ? "text-blue-600" : "text-green-600"
                    }`}>
                      <Info className="h-3 w-3" />
                      {getMessage()}
                    </p>
                  )}
                </div>

                {/* ชื่อยา */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">ชื่อยา *</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleStringInputChange("name")}
                    placeholder="ระบุชื่อยา"
                    className={`${errors.name ? "border-red-500" : ""} ${
                      isVariantMode ? "bg-gray-50" : ""
                    }`}
                    disabled={loading || isVariantMode}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* ชื่อสามัญ */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">ชื่อสามัญ</label>
                  <Input
                    value={formData.genericName || ""}
                    onChange={handleStringInputChange("genericName")}
                    placeholder="ระบุชื่อสามัญ"
                    className={isVariantMode ? "bg-gray-50" : ""}
                    disabled={loading || isVariantMode}
                  />
                </div>

                {/* รูปแบบยา */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">รูปแบบยา</label>
                  <Select
                    value={formData.dosageForm}
                    onValueChange={(value) =>
                      handleInputChange("dosageForm", value)
                    }
                    disabled={loading || isVariantMode}
                  >
                    <SelectTrigger className={isVariantMode ? "bg-gray-50" : ""}>
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

                {/* ความแรง */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    ความแรง หรือปริมาตร
                  </label>
                  <Input
                    value={formData.strength || ""}
                    onChange={handleStringInputChange("strength")}
                    placeholder="เช่น 500"
                    className={isVariantMode ? "bg-gray-50" : ""}
                    disabled={loading || isVariantMode}
                  />
                </div>

                {/* หน่วย */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    หน่วย ความแรงหรือปริมาตร *
                  </label>
                  <Input
                    name="unit"
                    value={formData.unit}
                    onChange={handleStringInputChange("unit")}
                    placeholder="เช่น mg, ml, tab"
                    className={`${errors.unit ? "border-red-500" : ""} ${
                      isVariantMode ? "bg-gray-50" : ""
                    }`}
                    disabled={loading || isVariantMode}
                  />
                  {errors.unit && !isVariantMode && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.unit}
                    </p>
                  )}
                </div>

                {/* ขนาดบรรจุ */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">ขนาดบรรจุ</label>
                  <Input
                    value={formData.packageSize || ""}
                    onChange={handleStringInputChange("packageSize")}
                    placeholder="เช่น 100"
                    className={isVariantMode ? "bg-gray-50" : ""}
                    disabled={loading || isVariantMode}
                  />
                </div>

                {/* ราคาต่อกล่อง - Enhanced for variants */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    ราคาต่อกล่อง (บาท) *
                    {isVariantMode && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        ราคาใหม่
                      </span>
                    )}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerBox}
                    onChange={handleNumberInputChange("pricePerBox")}
                    placeholder="0.00"
                    className={`${errors.pricePerBox ? "border-red-500" : ""} ${
                      isVariantMode ? "border-blue-300 focus:border-blue-500" : ""
                    }`}
                    disabled={loading}
                  />
                  {errors.pricePerBox && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.pricePerBox}
                    </p>
                  )}
                  {isVariantMode && !errors.pricePerBox && (
                    <p className="text-xs text-blue-600">
                      ระบุราคาที่แตกต่างจากราคาที่มีอยู่แล้ว
                    </p>
                  )}
                </div>
              </div>

              {/* ประเภทยา */}
              <div className="space-y-2">
                <label className="text-sm font-medium">ประเภทยา</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange("category", value)
                  }
                  disabled={loading || isVariantMode}
                >
                  <SelectTrigger className={isVariantMode ? "bg-gray-50" : ""}>
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

              {/* หมายเหตุ */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  หมายเหตุ
                  {isVariantMode && (
                    <span className="text-xs text-blue-600 ml-2">
                      (เฉพาะราคานี้)
                    </span>
                  )}
                </label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={handleStringInputChange("notes")}
                  placeholder={
                    isVariantMode 
                      ? "หมายเหตุสำหรับราคานี้โดยเฉพาะ..."
                      : "หมายเหตุเพิ่มเติม..."
                  }
                  className="min-h-[80px]"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stock Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                ข้อมูลสต็อก
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* จำนวนสต็อก */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    จำนวนสต็อกปัจจุบัน
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.initialQuantity}
                    onChange={handleNumberInputChange("initialQuantity")}
                    placeholder="0"
                    className={errors.initialQuantity ? "border-red-500" : ""}
                    disabled={loading}
                  />
                  {errors.initialQuantity && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.initialQuantity}
                    </p>
                  )}
                </div>

                {/* จำนวนขั้นต่ำ */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">ระบุขั้นต่ำ</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.minimumStock}
                    onChange={handleNumberInputChange("minimumStock")}
                    placeholder="10"
                    className={errors.minimumStock ? "border-red-500" : ""}
                    disabled={loading}
                  />
                  {errors.minimumStock && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.minimumStock}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Summary */}
              {(formData.initialQuantity > 0 || formData.pricePerBox > 0) && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-1">
                    สรุปสต็อกเริ่มต้น
                  </div>
                  <div className="text-xs text-blue-600 space-y-1">
                    <div>
                      จำนวน: {formData.initialQuantity.toLocaleString()} หน่วย
                    </div>
                    <div>
                      มูลค่า: ฿
                      {(
                        formData.initialQuantity * formData.pricePerBox
                      ).toLocaleString()}
                    </div>
                    <div>
                      ขั้นต่ำ: {formData.minimumStock.toLocaleString()} หน่วย
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading || !hasFormData}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              รีเซ็ต
            </Button>

            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              ยกเลิก
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isVariantMode ? "บันทึกราคาใหม่" : "บันทึก"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}