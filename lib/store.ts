// lib/store.ts
import { create } from 'zustand';
import { User, TimeSlot } from '@/types';

interface CalendarStore {
  users: User[];
  timeSlots: TimeSlot[];
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  addTimeSlot: (slot: TimeSlot) => void;
  removeTimeSlot: (slotId: string) => void;
  setTimeSlots: (slots: TimeSlot[]) => void;
  getUserTimeSlots: (userId: string) => TimeSlot[];
  getAllTimeSlots: () => TimeSlot[];
  getUsers: () => User[];
}

export const useCalendarStore = create<CalendarStore>((set: any, get: any) => ({
  users: [
    { id: '1', name: 'Evan', email: 'Evan@gmail.com', availability: 'Monday-Friday 9-5' },
    { id: '2', name: 'Efrem', email: 'efrem@gmail.com', availability: 'Monday-Friday 9-5' },
    { id: '3', name: 'Haile', email: 'Haile@gmail.com', availability: 'Monday-Friday 9-5' },
    { id: '4', name: 'Nathan', email: 'Nathan@gmail.com', availability: 'Monday-Wednesday 10-3' },
  ],
  timeSlots: [],

  addUser: (user: User) =>
    set((state: any) => ({
      users: [...state.users, user],
    })),

  removeUser: (userId: string) =>
    set((state: any) => ({
      users: state.users.filter((u: User) => u.id !== userId),
    })),

  addTimeSlot: (slot: TimeSlot) =>
    set((state: any) => ({
      timeSlots: [...state.timeSlots, slot],
    })),

  removeTimeSlot: (slotId: string) =>
    set((state: any) => ({
      timeSlots: state.timeSlots.filter((s: TimeSlot) => s.id !== slotId),
    })),

  setTimeSlots: (slots: TimeSlot[]) =>
    set(() => ({
      timeSlots: slots,
    })),

  getUserTimeSlots: (userId: string) => {
    const state = get();
    return state.timeSlots.filter((slot: TimeSlot) => slot.userId === userId || slot.attendees.includes(userId));
  },

  getAllTimeSlots: () => get().timeSlots,

  getUsers: () => get().users,
}));
