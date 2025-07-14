'use client'

import { useState, useEffect } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react'
import { Plus, Users, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { createInitialData } from '@/lib/initial-data'
import toast, { Toaster } from 'react-hot-toast'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert =
  Database['public']['Tables']['organizations']['Insert']

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgDescription, setNewOrgDescription] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
          organization_id,
          role,
          organizations (
            id,
            name,
            description,
            created_at,
            updated_at,
            created_by
          )
        `
        )
        .eq('user_id', user.id)

      if (error) throw error

      const orgs = data
        ?.map(item => item.organizations)
        .filter(Boolean) as any[]
      setOrganizations(orgs || [])
    } catch (error) {
      console.error('조직 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const createOrganization = async () => {
    if (!newOrgName.trim()) return

    setCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('사용자 인증이 필요합니다')

      // 조직 생성
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          description: newOrgDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // 조직 멤버로 추가 (owner 권한)
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
        })

      if (memberError) throw memberError

      // 기본 카테고리 및 결제수단 생성
      try {
        await createInitialData(org.id)
        console.log('기본 데이터 생성 완료')
        toast.success('조직이 성공적으로 생성되었습니다!')
      } catch (dataError) {
        console.error('기본 데이터 생성 실패:', dataError)
        toast.error('조직은 생성되었지만 기본 데이터 생성에 실패했습니다.')
        // 기본 데이터 생성 실패해도 조직은 생성되었으므로 계속 진행
      }

      // 목록 새로고침
      await fetchOrganizations()

      // 모달 닫기 및 폼 초기화
      onClose()
      setNewOrgName('')
      setNewOrgDescription('')
    } catch (error: any) {
      console.error('조직 생성 실패:', error)
      let errorMessage = '조직 생성에 실패했습니다.'
      if (error?.message?.includes('duplicate')) {
        errorMessage = '이미 존재하는 조직명입니다.'
      } else if (error?.message?.includes('permission')) {
        errorMessage = '조직 생성 권한이 없습니다.'
      } else if (error?.message?.includes('network')) {
        errorMessage = '네트워크 연결을 확인해주세요.'
      }
      toast.error(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const selectOrganization = (orgId: string) => {
    // 조직 선택 후 대시보드로 이동
    localStorage.setItem('selectedOrganization', orgId)
    window.location.href = '/dashboard'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">조직 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">조직 선택</h1>
            <p className="text-gray-600">
              관리할 조직을 선택하거나 새로운 조직을 생성하세요.
            </p>
          </div>
          <Button
            color="primary"
            startContent={<Plus className="h-5 w-5" />}
            onPress={onOpen}
          >
            새 조직 만들기
          </Button>
        </div>{' '}
        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              조직이 없습니다
            </h3>
            <p className="text-gray-600 mb-6">
              첫 번째 조직을 만들어 MoneyFlow를 시작하세요.
            </p>
            <Button
              color="primary"
              size="lg"
              startContent={<Plus className="h-5 w-5" />}
              onPress={onOpen}
            >
              조직 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map(org => (
              <Card
                key={org.id}
                isPressable
                onPress={() => selectOrganization(org.id)}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(org.created_at).toLocaleDateString('ko-KR')}{' '}
                        생성
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  {org.description && (
                    <p className="text-gray-600 text-sm">{org.description}</p>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}{' '}
        {/* 조직 생성 모달 */}
        <Modal isOpen={isOpen} onClose={onClose} size="md">
          <ModalContent>
            <ModalHeader>새 조직 만들기</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  label="조직 이름"
                  placeholder="예: 김씨 가족, ABC 팀"
                  value={newOrgName}
                  onValueChange={setNewOrgName}
                  isRequired
                />
                <Input
                  label="설명 (선택사항)"
                  placeholder="조직에 대한 간단한 설명"
                  value={newOrgDescription}
                  onValueChange={setNewOrgDescription}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} disabled={creating}>
                취소
              </Button>
              <Button
                color="primary"
                onPress={createOrganization}
                isLoading={creating}
                disabled={!newOrgName.trim()}
              >
                생성하기
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        {/* Toast 알림 */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </div>
  )
}
