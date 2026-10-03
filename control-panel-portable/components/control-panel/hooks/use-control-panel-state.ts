'use client';

import { useState } from 'react';
import type { SortField, Pipe, Inlet, Outlet, Drain } from '../types';

export type ProfileView = 'main' | 'edit' | 'links' | 'reports';

export function useControlPanelState() {
  const [activeTab, setActiveTab] = useState('overlays');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [profileView, setProfileView] = useState<ProfileView>('main');
  const [activeReportTab, setActiveReportTab] = useState<
    'submission' | 'reports'
  >('submission');
  const [activeAdminTab, setActiveAdminTab] = useState<
    'maintenance' | 'reports'
  >('reports');

  // Selected items state
  const [selectedInlet, setSelectedInlet] = useState<Inlet | null>(null);
  const [selectedPipe, setSelectedPipe] = useState<Pipe | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [selectedDrain, setSelectedDrain] = useState<Drain | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSearch = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  };

  const handleBack = () => {
    if (selectedInlet) setSelectedInlet(null);
    else if (selectedPipe) setSelectedPipe(null);
    else if (selectedOutlet) setSelectedOutlet(null);
    else if (selectedDrain) setSelectedDrain(null);
  };

  const getSelectedItem = () => {
    return selectedInlet || selectedPipe || selectedOutlet || selectedDrain;
  };

  const clearSelections = () => {
    setSelectedInlet(null);
    setSelectedPipe(null);
    setSelectedOutlet(null);
    setSelectedDrain(null);
  };

  return {
    activeTab,
    setActiveTab,
    sortField,
    sortDirection,
    searchTerm,
    profileView,
    setProfileView,
    activeReportTab,
    setActiveReportTab,
    setActiveAdminTab,
    activeAdminTab,
    selectedInlet,
    selectedPipe,
    selectedOutlet,
    selectedDrain,
    setSelectedInlet,
    setSelectedPipe,
    setSelectedOutlet,
    setSelectedDrain,
    handleSort,
    handleSearch,
    handleBack,
    getSelectedItem,
    clearSelections,
  };
}
