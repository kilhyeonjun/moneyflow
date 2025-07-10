'use client'

import { useState } from 'react'
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
        setError(error.message)
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
