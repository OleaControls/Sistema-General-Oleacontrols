import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TimeOff() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/hr/attendance', { replace: true }); }, [navigate]);
  return null;
}
