// app/register/page.tsx

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/app/utils/auth-client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Building2, 
  Eye, 
  EyeOff, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  UserPlus,
  Shield,
  Mail,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

// ✅ Interface ตรงกับ Prisma Schema
interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  email?: string;        // Optional ตรง schema
  phone?: string;        // Optional ตรง schema
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{
    show: boolean;
    requiresApproval: boolean;
    message: string;
  }>({ show: false, requiresApproval: false, message: '' });
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const { register, loading } = useAuth();
  const router = useRouter();

  const validateForm = (): boolean => {
    // ✅ Username validation ตาม Prisma constraint
    if (!formData.username?.trim() || formData.username.length < 3) {
      const errorMsg = 'Username ต้องมีอย่างน้อย 3 ตัวอักษร';
      setError(errorMsg);
      toast.error('Username ไม่ถูกต้อง', {
        description: errorMsg,
        icon: <AlertTriangle className="w-4 h-4" />,
        duration: 4000,
      });
      return false;
    }

    // Username pattern validation
    const usernamePattern = /^[a-zA-Z0-9._-]+$/;
    if (!usernamePattern.test(formData.username)) {
      const errorMsg = 'Username ใช้ได้เฉพาะ a-z, 0-9, ., _, -';
      setError(errorMsg);
      toast.error('Username ไม่ถูกต้อง', {
        description: errorMsg,
        icon: <AlertTriangle className="w-4 h-4" />,
        duration: 4000,
      });
      return false;
    }

    // Password validation
    if (!formData.password || formData.password.length < 6) {
      const errorMsg = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      setError(errorMsg);
      toast.error('รหัสผ่านไม่ถูกต้อง', {
        description: errorMsg,
        icon: <AlertTriangle className="w-4 h-4" />,
        duration: 4000,
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'รหัสผ่านไม่ตรงกัน';
      setError(errorMsg);
      toast.error('รหัสผ่านไม่ตรงกัน', {
        description: 'กรุณาตรวจสอบรหัสผ่านและการยืนยันรหัสผ่าน',
        icon: <XCircle className="w-4 h-4" />,
        duration: 4000,
      });
      return false;
    }

    // Name validation (Required ตาม schema)
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      const errorMsg = 'กรุณากรอกชื่อ-นามสกุล';
      setError(errorMsg);
      toast.error('ข้อมูลไม่ครบถ้วน', {
        description: errorMsg,
        icon: <AlertTriangle className="w-4 h-4" />,
        duration: 4000,
      });
      return false;
    }

    // Email validation (Optional แต่ต้องถูกรูปแบบถ้ากรอก)
    if (formData.email?.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email)) {
        const errorMsg = 'รูปแบบอีเมลไม่ถูกต้อง';
        setError(errorMsg);
        toast.error('อีเมลไม่ถูกต้อง', {
          description: errorMsg,
          icon: <AlertTriangle className="w-4 h-4" />,
          duration: 4000,
        });
        return false;
      }
    }

    // Terms validation
    if (!acceptedTerms) {
      const errorMsg = 'กรุณายอมรับเงื่อนไขการใช้งาน';
      setError(errorMsg);
      toast.error('ยังไม่ได้ยอมรับเงื่อนไข', {
        description: 'กรุณาอ่านและยอมรับเงื่อนไขการใช้งานก่อนสมัครสมาชิก',
        icon: <Shield className="w-4 h-4" />,
        duration: 5000,
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    const loadingToast = toast.loading('กำลังสร้างบัญชีผู้ใช้', {
      description: 'กรุณารอสักครู่...',
    });

    try {
      // ✅ ส่งข้อมูลตรงกับ Prisma Schema
      const registerData = {
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        // ส่งเฉพาะ fields ที่มีข้อมูล (Optional fields)
        ...(formData.email?.trim() && { email: formData.email.trim().toLowerCase() }),
        ...(formData.phone?.trim() && { phone: formData.phone.trim() }),
      };

      const result = await register(registerData);
      
      toast.dismiss(loadingToast);
      
      if (result.success) {
        // ✅ สมัครสมาชิกสำเร็จ - แสดงสถานะตาม requiresApproval
        setSuccess({
          show: true,
          requiresApproval: result.requiresApproval || true, // Default ต้องรออนุมัติ
          message: result.requiresApproval 
            ? 'สมัครสมาชิกสำเร็จ! กรุณารอการอนุมัติจากผู้ดูแลระบบ'
            : 'สมัครสมาชิกสำเร็จ! คุณสามารถเข้าสู่ระบบได้ทันที'
        });
        
        toast.success('สมัครสมาชิกสำเร็จ!', {
          description: result.requiresApproval 
            ? 'บัญชีของคุณได้รับการสร้างแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ'
            : 'คุณสามารถเข้าสู่ระบบได้ทันที',
          icon: <UserPlus className="w-4 h-4" />,
          duration: 5000,
        });
        
        // Redirect ไป login หลัง 3 วินาที
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        const errorMsg = result.error || 'สมัครสมาชิกไม่สำเร็จ';
        setError(errorMsg);
        
        // ✅ แสดง error message ที่เฉพาะเจาะจง
        if (errorMsg.includes('username') || errorMsg.includes('Username')) {
          toast.error('Username นี้มีคนใช้แล้ว', {
            description: 'กรุณาเลือก Username อื่น',
            icon: <XCircle className="w-4 h-4" />,
            duration: 5000,
            action: {
              label: "แก้ไข",
              onClick: () => {
                setError('');
                document.getElementById('username')?.focus();
              },
            },
          });
        } else if (errorMsg.includes('email') || errorMsg.includes('Email')) {
          toast.error('อีเมลนี้มีคนใช้แล้ว', {
            description: 'กรุณาใช้อีเมลอื่น หรือเว้นว่างไว้',
            icon: <XCircle className="w-4 h-4" />,
            duration: 5000,
          });
        } else {
          toast.error('สมัครสมาชิกไม่สำเร็จ', {
            description: errorMsg,
            icon: <XCircle className="w-4 h-4" />,
            duration: 5000,
          });
        }
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      
      console.error('Registration error:', error);
      const errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      setError(errorMsg);
      toast.error('ไม่สามารถเชื่อมต่อได้', {
        description: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง',
        icon: <XCircle className="w-4 h-4" />,
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError('');
  };

  const handleLoginClick = () => {
    toast.info('กำลังไปหน้าเข้าสู่ระบบ', {
      description: 'จะนำไปยังหน้าเข้าสู่ระบบในอีกสักครู่',
      duration: 2000,
    });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 text-sm">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (success.show) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6 text-center">
            <div className="mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                success.requiresApproval ? 'bg-orange-100' : 'bg-green-100'
              }`}>
                {success.requiresApproval ? (
                  <Clock className="w-8 h-8 text-orange-600" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {success.requiresApproval ? 'รอการอนุมัติ' : 'สมัครสมาชิกสำเร็จ'}
            </h3>
            
            <p className="text-gray-600 mb-4">{success.message}</p>
            
            <div className={`border rounded-lg p-4 mb-6 ${
              success.requiresApproval 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-sm ${
                success.requiresApproval ? 'text-orange-700' : 'text-green-700'
              }`}>
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                บัญชีของคุณได้รับการสร้างเรียบร้อยแล้ว
              </p>
              <p className={`text-sm mt-1 ${
                success.requiresApproval ? 'text-orange-600' : 'text-green-600'
              }`}>
                {success.requiresApproval 
                  ? 'ติดต่อผู้ดูแลระบบเพื่อขออนุมัติการใช้งาน'
                  : 'คุณสามารถเข้าสู่ระบบได้ทันที'
                }
              </p>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...
            </p>
            
            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">InvenStock</h1>
              <p className="text-sm text-gray-600">Multi-Tenant Inventory System V1.0</p>
            </div>
          </div>
        </div>

        {/* Register Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">สมัครสมาชิก</CardTitle>
            <CardDescription className="text-center">
              กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Username - Required */}
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Username (a-z, 0-9, ., _, -)"
                  disabled={isLoading}
                  className="h-11"
                  autoComplete="username"
                  required
                />
                <p className="text-xs text-gray-500">
                  ต้องมีอย่างน้อย 3 ตัวอักษร ใช้ได้เฉพาะ a-z, 0-9, ., _, -
                </p>
              </div>

              {/* Name - Required */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">ชื่อ *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="ชื่อ"
                    disabled={isLoading}
                    className="h-11"
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">นามสกุล *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="นามสกุล"
                    disabled={isLoading}
                    className="h-11"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              {/* Email - Optional */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-1" />
                  อีเมล (ไม่บังคับ)
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com (สำหรับการแจ้งเตือน)"
                  disabled={isLoading}
                  className="h-11"
                  autoComplete="email"
                />
                <p className="text-xs text-gray-500">
                  ใช้สำหรับการแจ้งเตือนและกู้คืนรหัสผ่าน (ไม่บังคับ)
                </p>
              </div>

              {/* Phone - Optional */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="w-4 h-4 inline mr-1" />
                  เบอร์โทรศัพท์ (ไม่บังคับ)
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="08x-xxx-xxxx"
                  disabled={isLoading}
                  className="h-11"
                  autoComplete="tel"
                />
              </div>

              {/* Password - Required */}
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                    disabled={isLoading}
                    className="h-11 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-10 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password - Required */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="ยืนยันรหัสผ่าน"
                    disabled={isLoading}
                    className="h-11 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-10 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Terms of Service */}
              <div className="space-y-4 pt-2">
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => {
                        setAcceptedTerms(checked as boolean);
                        if (error && checked) {
                          setError('');
                        }
                      }}
                      disabled={isLoading}
                      className="h-4 w-4"
                    />
                    <Label 
                      htmlFor="terms" 
                      className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                    >
                      ข้าพเจ้าได้อ่านและยอมรับเงื่อนไขการใช้งาน *
                    </Label>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <Shield className="w-3 h-3 inline mr-1" />
                      บัญชีที่สร้างใหม่จะอยู่ในสถานะ "รออนุมัติ" กรุณาติดต่อผู้ดูแลระบบเพื่อขออนุมัติการใช้งาน
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className={`w-full h-11 text-base transition-colors duration-200 ${
                  acceptedTerms 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-gray-400 hover:bg-gray-500'
                }`}
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังสร้างบัญชี...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    สมัครสมาชิก
                  </>
                )}
              </Button>
            </form>

            {/* Login link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                มีบัญชีอยู่แล้ว?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                  onClick={handleLoginClick}
                  disabled={isLoading}
                >
                  เข้าสู่ระบบ
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>InvenStock - Multi-Tenant Inventory Management</p>
          <p>© 2025 - Enterprise Grade Solution</p>
        </div>
      </div>
    </div>
  );
}