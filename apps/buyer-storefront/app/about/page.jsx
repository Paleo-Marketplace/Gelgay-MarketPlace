import AboutClient from '../../components/AboutClient';

export default function AboutPage() {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return <AboutClient apiUrl={apiUrl} />;
}
