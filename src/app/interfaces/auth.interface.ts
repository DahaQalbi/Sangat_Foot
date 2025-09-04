import { Role } from 'src/app/enums/role.enum';

export interface LoginCredentials {
  email: string;
  password: string;
  role: Role;
}
