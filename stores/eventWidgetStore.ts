import { create } from 'zustand';

// Define the shape of the data for the new event
export interface NewEventData {
  eventName: string;
  summary: string;
  data: Record<string, string>;
}

// Define the state and actions of the store
interface EventWidgetState {
  isOpen: boolean;
  eventData: NewEventData | null;
  openWidget: (data: NewEventData) => void;
  closeWidget: () => void;
}

export const useEventWidgetStore = create<EventWidgetState>((set) => ({
  isOpen: false,
  eventData: null,
  openWidget: (data) => set({ isOpen: true, eventData: data }),
  closeWidget: () => set({ isOpen: false, eventData: null }),
}));
