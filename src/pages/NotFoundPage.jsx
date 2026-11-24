import { useNavigate } from 'react-router-dom'
import { Button, Card, WashingLoader } from '../components/ui'
import { useI18n } from '../context/I18nContext'

export default function NotFoundPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  return (
    <Card className="mx-auto mt-10 max-w-md p-8 text-center">
      <WashingLoader size={110} />
      <h1 className="mt-4 text-xl font-bold">{t('notFound.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('notFound.text')}</p>
      <Button className="mt-5" onClick={() => navigate('/')}>{t('nav.dashboard')}</Button>
    </Card>
  )
}
