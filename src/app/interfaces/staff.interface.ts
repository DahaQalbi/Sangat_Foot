import { Role } from 'src/app/enums/role.enum';

export interface AddManagePayload {
  email: string;
  password: string;
  role: Role; // e.g., Role.Manager
  name: string;
  phone: string;
  cnic: string;
  image?: string; // base64 encoded image
  agreement: string; // base64 encoded agreement document
  idCard: string; // base64 encoded ID card
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

export interface UpdateManagerPayload {
  id: string | number;
  email: string;
  password: string;
  phone: string;
  name: string;
}
