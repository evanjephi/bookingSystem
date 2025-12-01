'use client';

import { User } from '@/types';
import { Users } from 'lucide-react';

interface UserListProps {
  users: User[];
}

export default function UserList({ users }: UserListProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <Users size={20} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-800">Available Users</h2>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-indigo-50 transition-colors"
          >
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <p className="mt-1 text-xs text-gray-600">{user.availability}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
