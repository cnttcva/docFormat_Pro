// File: src/components/hooks/useStaffSearch.ts
import { useState, useRef, useEffect } from 'react';
import { Staff, HeaderType } from '../../types';
import { fetchStaffSuggestions } from '../../services/staffService';

export const useStaffSearch = (setOptions: any, currentSchoolId: string) => {
  const [suggestions, setSuggestions] = useState<Staff[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click ra ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNameInput = (val: string, field: string, isFocus = false) => {
    setOptions((prev: any) => ({ ...prev, [field]: val }));
    setActiveField(field);
    setFirebaseError(null);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (val.trim().length >= 2 || isFocus) {
      setIsSearching(true);
      searchTimeout.current = setTimeout(async () => {
        try {
          const data = await fetchStaffSuggestions(val, currentSchoolId || "THCS_CVA");
          setSuggestions(data || []);
          setShowDropdown(data && data.length > 0);
        } catch (error: any) {
          setFirebaseError(`Firebase từ chối kết nối: ${error.message}`);
          setSuggestions([]);
          setShowDropdown(false);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
    }
  };

  const handleSelectStaff = (staff: Staff, targetName: string) => {
    setOptions((prev: any) => {
      const nextState = { ...prev };
      nextState[targetName] = staff.fullName;
      
      let finalPosition = "";
      if (prev.headerType === HeaderType.PARTY) {
        finalPosition = (staff.partyPosition || staff.position || "").toUpperCase();
      } else {
        finalPosition = (staff.position || "").toUpperCase();
      }

      if (targetName === 'signerName') nextState.signerTitle = finalPosition;
      if (targetName === 'approverName') nextState.approverTitle = finalPosition;
      
      return nextState;
    });
    
    setShowDropdown(false);
    setSuggestions([]);
    setIsSearching(false);
  };

  return {
    suggestions,
    showDropdown,
    activeField,
    isSearching,
    firebaseError,
    dropdownRef,
    handleNameInput,
    handleSelectStaff
  };
};