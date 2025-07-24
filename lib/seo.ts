import type { Metadata, Viewport } from 'next'

// 기본 뷰포트 설정
export const defaultViewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3B82F6' },
    { media: '(prefers-color-scheme: dark)', color: '#1E40AF' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

// 기본 SEO 설정
export const defaultSEO: Metadata = {
  title: {
    default: 'MoneyFlow - 조직 단위 가계부 관리',
    template: '%s | MoneyFlow',
  },
  description:
    '가족과 팀을 위한 종합 재정 관리 시스템. 조직 단위로 재정을 관리하고, 목표를 설정하며, 실시간으로 동기화되는 스마트한 가계부 서비스입니다.',
  keywords: [
    '가계부',
    '재정관리',
    '조직',
    '가족',
    '팀',
    '자산관리',
    '예산',
    '지출관리',
    '수입관리',
    '저축',
    '투자',
    '재정계획',
    '가족가계부',
    '팀예산관리',
    '실시간동기화',
    'MoneyFlow',
  ],
  authors: [
    {
      name: 'MoneyFlow Team',
      url: 'https://moneyflow.vercel.app',
    },
  ],
  creator: 'MoneyFlow Team',
  publisher: 'MoneyFlow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://moneyflow.vercel.app'),
  alternates: {
    canonical: '/',
    languages: {
      'ko-KR': '/ko',
      'en-US': '/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://moneyflow.vercel.app',
    siteName: 'MoneyFlow',
    title: 'MoneyFlow - 조직 단위 가계부 관리',
    description: '가족과 팀을 위한 종합 재정 관리 시스템',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MoneyFlow - 조직 단위 가계부 관리',
      },
      {
        url: '/og-image-square.png',
        width: 1200,
        height: 1200,
        alt: 'MoneyFlow Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoneyFlow - 조직 단위 가계부 관리',
    description: '가족과 팀을 위한 종합 재정 관리 시스템',
    images: ['/twitter-image.png'],
    creator: '@moneyflow_app',
    site: '@moneyflow_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#3B82F6',
      },
    ],
  },
  manifest: '/manifest.json',
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'finance',
}

// 페이지별 SEO 설정 생성 함수
export function generatePageSEO({
  title,
  description,
  path = '',
  images,
  noIndex = false,
}: {
  title: string
  description: string
  path?: string
  images?: string[]
  noIndex?: boolean
}): Metadata {
  const url = `https://moneyflow.vercel.app${path}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      images: images || ['/og-image.png'],
    },
    twitter: {
      title,
      description,
      images: images || ['/twitter-image.png'],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  }
}

// 구조화된 데이터 (JSON-LD)
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MoneyFlow',
  description: '가족과 팀을 위한 종합 재정 관리 시스템',
  url: 'https://moneyflow.vercel.app',
  logo: 'https://moneyflow.vercel.app/logo.png',
  sameAs: [
    'https://twitter.com/moneyflow_app',
    'https://github.com/moneyflow-app',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'support@moneyflow.app',
  },
}

export const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MoneyFlow',
  description: '가족과 팀을 위한 종합 재정 관리 시스템',
  url: 'https://moneyflow.vercel.app',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
  featureList: [
    '조직 단위 재정 관리',
    '실시간 동기화',
    '3단계 분류 체계',
    '목표 지향적 관리',
    '자산 및 부채 추적',
    '통계 및 분석',
  ],
}

// 빵부스러기 네비게이션 스키마 생성
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://moneyflow.vercel.app${item.url}`,
    })),
  }
}
