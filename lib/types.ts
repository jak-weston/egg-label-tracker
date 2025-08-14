export interface LabelEntry {
  id: string;
  egg_id: string;
  name: string;
  cage: string;
  link: string;
  createdAt: string;
  isReset?: boolean; // Optional flag for reset entries
}
