import { Role } from 'src/app/enums/role.enum';

export interface AddManagePayload {
  email: string;
  password: string;
  role: Role; // e.g., Role.Manager
  name: string;
  phone: string;
}

export interface ManagerItem {
  id?: string | number;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: Role;
  create_at?: string; // ISO date string from backend
  created_at?: string; // ISO date string from backend
}
