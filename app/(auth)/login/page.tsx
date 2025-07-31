'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, Input, Link } from '@heroui/react'
import { BarChart3, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // 영어 에러 메시지를 한글로 변환
        let koreanError = error.message
        if (error.message.includes('Invalid login credentials')) {
          koreanError = '이메일 또는 비밀번호가 올바르지 않습니다.'
        } else if (error.message.includes('Email not confirmed')) {
          koreanError =
            '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.'
        } else if (error.message.includes('Too many requests')) {
          koreanError =
            '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        } else if (error.message.includes('Network')) {
          koreanError = '네트워크 연결을 확인해주세요.'
        }
        setError(koreanError)
      } else {
        router.push('/organizations')
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
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
          <p className="text-gray-600">계정에 로그인하세요</p>
        </div>

        {/* Login Form */}
        <Card className="p-6">
          <CardHeader className="pb-6">
            <h1 className="text-2xl font-bold text-center">로그인</h1>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

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
                placeholder="비밀번호를 입력하세요"
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

              <Button
                type="submit"
                color="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                로그인
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                계정이 없으신가요?{' '}
                <Link href="/signup" className="text-blue-600 hover:underline">
                  회원가입
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
