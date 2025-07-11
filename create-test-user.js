const { createClient } = require('@supabase/supabase-js')

// Supabase 설정 (환경변수에서 가져오기)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Service Role로 Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  try {
    console.log('테스트 사용자 생성 중...')
    
    // Admin API를 사용하여 사용자 생성 (이메일 인증 없이)
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@moneyflow.com',
      password: 'admin123',
      email_confirm: true, // 이메일 인증을 자동으로 완료
      user_metadata: {
        name: '관리자'
      }
    })

    if (error) {
      console.error('사용자 생성 실패:', error)
      return
    }

    console.log('테스트 사용자 생성 성공!')
    console.log('이메일: admin@moneyflow.com')
    console.log('비밀번호: admin123')
    console.log('사용자 ID:', data.user.id)
    console.log('이메일 인증 상태:', data.user.email_confirmed_at ? '완료' : '미완료')
    
  } catch (err) {
    console.error('오류 발생:', err)
  }
}

createTestUser()
