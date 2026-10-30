import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getUserType, type UserType } from '../api/http';

interface Props {
  // без roles пускает любого вошедшего пользователя
  roles?: UserType[];
  children: ReactNode;
}

// это удобство интерфейса: настоящие права чекает бэкенд
export default function RequireRole({ roles, children }: Props) {
  const role = getUserType();
  if (!role) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/profile" replace />;
  return <>{children}</>;
}