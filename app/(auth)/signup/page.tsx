'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, Input, Link } from '@heroui/react'
import { BarChart3, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  // 페이지 로드 시 인증 상태 확인 및 토큰 정리
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // 현재 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          // 토큰 관련 오류 발생 시 강제 로그아웃
          console.warn('토큰 확인 중 오류:', error)
          await supabase.auth.signOut()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('selectedOrganization')
          }
        } else if (session) {
          // 이미 로그인된 경우 조직 선택 페이지로 리다이렉트
          console.log('이미 로그인됨, 조직 선택 페이지로 이동')
          router.push('/organizations')
        }
      } catch (err) {
        // 토큰 관련 오류 발생 시 강제 로그아웃
        console.warn('인증 확인 중 오류:', err)
        await supabase.auth.signOut()
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedOrganization')
        }
      }
    }

    checkAuthAndRedirect()

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // 로그인 성공 시 조직 선택 페이지로 이동
        router.push('/organizations')
      } else if (event === 'SIGNED_OUT') {
        // 로그아웃 시 localStorage 정리
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedOrganization')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const toggleVisibility = () => setIsVisible(!isVisible)
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setIsLoading(false)
      return
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        // 영어 에러 메시지를 한글로 변환
        let koreanError = error.message
        if (
          error.message.includes('Email address') &&
          error.message.includes('invalid')
        ) {
          koreanError = '유효하지 않은 이메일 주소입니다.'
        } else if (error.message.includes('Password should be at least')) {
          koreanError = '비밀번호는 최소 6자 이상이어야 합니다.'
        } else if (error.message.includes('User already registered')) {
          koreanError = '이미 등록된 이메일 주소입니다.'
        } else if (error.message.includes('Signup requires a valid password')) {
          koreanError = '유효한 비밀번호를 입력해주세요.'
        } else if (error.message.includes('Network')) {
          koreanError = '네트워크 연결을 확인해주세요.'
        }
        setError(koreanError)
      } else {
        setSuccess('회원가입이 완료되었습니다! 이메일을 확인해주세요.')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BarChart3 className="h-10 w-10 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">MoneyFlow</span>
          </div>
          <p className="text-gray-600">새 계정을 만드세요</p>
        </div>{' '}
        {/* Signup Form */}
        <Card className="p-6">
          <CardHeader className="pb-6">
            <h1 className="text-2xl font-bold text-center">회원가입</h1>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
                  {success}
                </div>
              )}

              <Input
                type="text"
                label="이름"
                placeholder="이름을 입력하세요"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                startContent={<User className="h-4 w-4 text-gray-400" />}
                required
              />

              <Input
                type="email"
                label="이메일"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={e => setEmail(e.target.value)}
                startContent={<Mail className="h-4 w-4 text-gray-400" />}
                required
              />

              <Input
                label="비밀번호"
                placeholder="비밀번호를 입력하세요 (최소 6자)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                startContent={<Lock className="h-4 w-4 text-gray-400" />}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={toggleVisibility}
                  >
                    {isVisible ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                }
                type={isVisible ? 'text' : 'password'}
                required
              />

              <Input
                label="비밀번호 확인"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                startContent={<Lock className="h-4 w-4 text-gray-400" />}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={toggleConfirmVisibility}
                  >
                    {isConfirmVisible ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                }
                type={isConfirmVisible ? 'text' : 'password'}
                required
              />

              <Button
                type="submit"
                color="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                회원가입
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                  로그인
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
