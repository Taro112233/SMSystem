// 📄 File: hooks/use-drug-code-validation.ts (UPDATED - Multiple Price Support)
// ✅ ปรับให้รองรับยาหลายราคาที่ใช้รหัสเดียวกัน

import { useState, useEffect, useCallback } from 'react';

// ✅ อัปเดต interface ให้รองรับ multiple variants
interface ValidationResult {
  available: boolean;
  exists: boolean;
  canCreateVariant?: boolean; // ✅ เพิ่ม flag ใหม่
  drugs?: Array<{           // ✅ เปลี่ยนจาก drug เป็น drugs (array)
    id: string;
    hospitalDrugCode: string;
    name: string;
    genericName: string | null;
    dosageForm: string;
    strength: string | null;
    unit: string;
    category: string;
    packageSize: string | null;
    pricePerBox: number;
    notes: string | null;
    createdAt: string;
    stocks?: Array<{
      department: string;
      totalQuantity: number;
    }>;
  }>;
  templateDrug?: any; // ยาที่จะใช้เป็น template สำหรับ auto-fill
  priceRange?: {     // ✅ เพิ่มข้อมูลช่วงราคา
    min: number;
    max: number;
    count: number;
  };
  suggestions?: Array<{
    hospitalDrugCode: string;
    name: string;
    pricePerBox?: number;
  }>;
  message?: string;
}

interface ValidationState {
  isChecking: boolean;
  result: ValidationResult | null;
  error: string | null;
}

export function useDrugCodeValidation(initialCode: string = '') {
  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<ValidationState>({
    isChecking: false,
    result: null,
    error: null
  });

  // Debounce logic
  const [debouncedCode, setDebouncedCode] = useState(initialCode);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 500);

    return () => clearTimeout(timer);
  }, [code]);

  // Validation function
  const checkCode = useCallback(async (codeToCheck: string) => {
    if (!codeToCheck.trim()) {
      setState({
        isChecking: false,
        result: null,
        error: null
      });
      return;
    }

    setState(prev => ({
      ...prev,
      isChecking: true,
      error: null
    }));

    try {
      const response = await fetch(
        `/api/drugs/check-code?code=${encodeURIComponent(codeToCheck.trim())}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: ValidationResult = await response.json();
      
      setState({
        isChecking: false,
        result,
        error: null
      });

    } catch (error) {
      console.error('Code validation error:', error);
      setState({
        isChecking: false,
        result: null,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      });
    }
  }, []);

  // Auto-check เมื่อ debounced code เปลี่ยน
  useEffect(() => {
    checkCode(debouncedCode);
  }, [debouncedCode, checkCode]);

  // Manual check (สำหรับการ retry)
  const manualCheck = useCallback(() => {
    checkCode(code.trim());
  }, [code, checkCode]);

  // Reset state
  const reset = useCallback(() => {
    setCode('');
    setState({
      isChecking: false,
      result: null,
      error: null
    });
  }, []);

  // Update code
  const updateCode = useCallback((newCode: string) => {
    setCode(newCode);
    
    // Clear previous result immediately when typing
    if (newCode.trim() !== debouncedCode) {
      setState(prev => ({
        ...prev,
        result: null,
        error: null
      }));
    }
  }, [debouncedCode]);

  return {
    // State
    code,
    isChecking: state.isChecking,
    result: state.result,
    error: state.error,
    
    // ✅ Updated computed states
    isAvailable: state.result?.available === true,
    isDuplicate: false, // ✅ ไม่มี duplicate แล้ว เพราะรองรับ multiple variants
    hasExistingVariants: state.result?.exists === true,
    canCreateVariant: state.result?.canCreateVariant === true,
    hasResult: state.result !== null,
    
    // ✅ Updated data access
    existingDrugs: state.result?.drugs || [],
    templateDrug: state.result?.templateDrug || null,
    priceRange: state.result?.priceRange || null,
    suggestions: state.result?.suggestions || [],
    
    // Actions
    updateCode,
    manualCheck,
    reset,
    
    // ✅ Updated validation status helpers
    getValidationStatus: () => {
      if (!code.trim()) return 'empty';
      if (state.isChecking) return 'checking';
      if (state.error) return 'error';
      if (state.result?.available) {
        if (state.result.exists) return 'variants'; // ✅ เปลี่ยนจาก duplicate
        return 'available';
      }
      return 'unknown';
    },
    
    // ✅ Updated message helper
    getMessage: () => {
      const status = state.isChecking ? 'checking' : 
                    state.error ? 'error' :
                    state.result?.available ? 
                      (state.result.exists ? 'variants' : 'available') :
                    'empty';
      
      switch (status) {
        case 'checking':
          return 'กำลังตรวจสอบ...';
        case 'error':
          return state.error || 'เกิดข้อผิดพลาด';
        case 'available':
          return `รหัส "${code.trim()}" ใช้ได้ (รหัสใหม่)`;
        case 'variants':
          const count = state.result?.priceRange?.count || 0;
          const minPrice = state.result?.priceRange?.min || 0;
          const maxPrice = state.result?.priceRange?.max || 0;
          return `รหัส "${code.trim()}" มี ${count} รายการ (ราคา ฿${minPrice.toLocaleString()}-${maxPrice.toLocaleString()})`;
        case 'empty':
        default:
          return '';
      }
    },

    // ✅ Helper functions สำหรับ UI
    getVariantSummary: () => {
      if (!state.result?.exists) return null;
      
      const drugs = state.result.drugs || [];
      const priceRange = state.result.priceRange;
      
      return {
        count: drugs.length,
        priceRange,
        latestPrice: drugs[drugs.length - 1]?.pricePerBox || 0,
        averagePrice: drugs.length > 0 
          ? drugs.reduce((sum, d) => sum + d.pricePerBox, 0) / drugs.length 
          : 0
      };
    },

    getSuggestedNextPrice: () => {
      if (!state.result?.exists) return null;
      
      const drugs = state.result.drugs || [];
      if (drugs.length === 0) return null;

      // แนะนำราคาถัดไป (เพิ่มขึ้น 5-10%)
      const maxPrice = Math.max(...drugs.map(d => d.pricePerBox));
      return Math.round(maxPrice * 1.05 * 100) / 100;
    }
  };
}

// ✅ Updated debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}