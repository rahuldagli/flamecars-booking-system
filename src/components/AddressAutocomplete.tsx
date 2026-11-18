'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AddressAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  isOrigin?: boolean;
}

export default function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing address or postcode...',
  label,
  required = false,
  isOrigin = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUserTypingRef = useRef<boolean>(false);

  // Fetch suggestions when query changes (only if triggered by active user typing)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!isUserTypingRef.current) {
      // Programmatic change or item selection - keep dropdown closed
      setIsOpen(false);
      return;
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!isUserTypingRef.current) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/address/autocomplete?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.suggestions) && isUserTypingRef.current) {
          setSuggestions(data.suggestions);
          setIsOpen(data.suggestions.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.warn('Address autocomplete error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        isUserTypingRef.current = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedAddress: string) => {
    isUserTypingRef.current = false;
    onChange(selectedAddress);
    if (onSelect) onSelect(selectedAddress);
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            fontWeight: 600,
            fontSize: '13px',
            marginBottom: '6px',
            color: '#1e293b',
          }}
        >
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            position: 'absolute',
            left: '12px',
            fontSize: '16px',
            color: '#64748b',
            pointerEvents: 'none',
          }}
        >
          {isOrigin ? '📍' : '🏁'}
        </span>

        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            isUserTypingRef.current = true;
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (isUserTypingRef.current && suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '12px 38px 12px 38px',
            borderRadius: '8px',
            border: isOpen ? '1px solid #ed6b24' : '1px solid #cbd5e1',
            fontSize: '15px',
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: isOpen ? '0 0 0 3px rgba(237, 107, 36, 0.15)' : 'none',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />

        {/* Clear or Loading Icon */}
        <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
          {isLoading ? (
            <span style={{ fontSize: '12px', color: '#64748b' }}>⏳</span>
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                isUserTypingRef.current = false;
                onChange('');
                setSuggestions([]);
                setIsOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 4px',
              }}
              title="Clear"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 8px 10px -4px rgba(0, 0, 0, 0.05)',
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 99999,
            listStyle: 'none',
            margin: 0,
            padding: '6px 0',
          }}
        >
          {suggestions.map((suggestion, index) => {
            const isSelected = selectedIndex === index;
            const parts = suggestion.split(', ');
            const title = parts[0] || suggestion;
            const subtitle = parts.slice(1).join(', ');

            return (
              <li
                key={index}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  background: isSelected ? '#fff7ed' : 'transparent',
                  borderLeft: isSelected ? '3px solid #ed6b24' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ fontSize: '15px', marginTop: '1px' }}>📍</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: isSelected ? '#c2410c' : '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {title}
                  </div>
                  {subtitle && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '1px',
                      }}
                    >
                      {subtitle}
                    </div>
                  )}
                </div>
              </li>
            );
          })}

          <li
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              color: '#94a3b8',
              textAlign: 'right',
              borderTop: '1px solid #f1f5f9',
              marginTop: '4px',
            }}
          >
            🇬🇧 Restricted to United Kingdom addresses
          </li>
        </ul>
      )}
    </div>
  );
}
