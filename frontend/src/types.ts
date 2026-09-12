export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}
