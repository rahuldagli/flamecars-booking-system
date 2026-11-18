'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DateTimePickerProps {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  minAdvanceNoticeMinutes?: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Generate 15-minute interval time slots for 24 hours
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    TIME_SLOTS.push(`${hh}:${mm}`);
  }
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return 'Select Date';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const dayOfWeek = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const dayNum = d.getDate();
  const monthName = d.toLocaleDateString('en-GB', { month: 'short' });
  const year = d.getFullYear();

  if (diffDays === 0) return `Today, ${dayNum} ${monthName}`;
  if (diffDays === 1) return `Tomorrow, ${dayNum} ${monthName}`;
  return `${dayOfWeek}, ${dayNum} ${monthName} ${year}`;
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return 'Select Time';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${timeStr} (${hour12}:${String(m).padStart(2, '0')} ${period})`;
}

export default function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  minAdvanceNoticeMinutes = 45,
}: DateTimePickerProps) {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  // Month navigation for date calendar
  const initialYear = date ? Number(date.split('-')[0]) : new Date().getFullYear();
  const initialMonth = date ? Number(date.split('-')[1]) - 1 : new Date().getMonth();
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Filter time slots by period
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDateOpen(false);
        setIsTimeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if a time slot is in the past for the selected date
  const isTimeInPast = (timeSlot: string) => {
    if (!date) return false;
    const now = new Date();
    const [h, m] = timeSlot.split(':').map(Number);
    const [y, mon, d] = date.split('-').map(Number);

    const slotDate = new Date(y, mon - 1, d, h, m, 0, 0);
    const minAllowed = new Date(now.getTime() + minAdvanceNoticeMinutes * 60 * 1000);
    return slotDate < minAllowed;
  };

  // Generate calendar days
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Select quick preset date
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const newDateStr = `${yyyy}-${mm}-${dd}`;
    onDateChange(newDateStr);

    // If setting to today, ensure time is valid
    if (offsetDays === 0 && isTimeInPast(time)) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 60);
      const nextH = String(now.getHours()).padStart(2, '0');
      const nextM = String(Math.ceil(now.getMinutes() / 15) * 15 % 60).padStart(2, '0');
      onTimeChange(`${nextH}:${nextM}`);
    }

    setIsDateOpen(false);
  };

  const filteredTimeSlots = TIME_SLOTS.filter((slot) => {
    const h = Number(slot.split(':')[0]);
    if (timeFilter === 'morning') return h >= 6 && h < 12;
    if (timeFilter === 'afternoon') return h >= 12 && h < 18;
    if (timeFilter === 'evening') return h >= 18 && h < 24;
    if (timeFilter === 'night') return h >= 0 && h < 6;
    return true;
  });

  return (
    <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', position: 'relative' }}>
      {/* ================= DATE PICKER ================= */}
      <div style={{ position: 'relative' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#1e293b' }}>
          Pickup Date <span style={{ color: '#ef4444' }}>*</span>
        </label>

        <button
          type="button"
          onClick={() => {
            setIsDateOpen(!isDateOpen);
            setIsTimeOpen(false);
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '10px',
            border: isDateOpen ? '2px solid #ed6b24' : '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            color: date ? '#0f172a' : '#94a3b8',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: isDateOpen ? '0 0 0 3px rgba(237, 107, 36, 0.15)' : 'none',
            outline: 'none',
            transition: 'all 0.15s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarIcon size={18} style={{ color: '#ed6b24', flexShrink: 0 }} />
            <span>{formatDisplayDate(date)}</span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>▼</span>
        </button>

        {/* Date Calendar Popover */}
        {isDateOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '320px',
              maxWidth: '90vw',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.16), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
              padding: '16px',
              zIndex: 99999,
            }}
          >
            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(2)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                +2 Days
              </button>
            </div>

            {/* Month & Year Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={viewYear === todayY && viewMonth <= todayM}
                style={{
                  background: 'none',
                  border: 'none',
                  color: viewYear === todayY && viewMonth <= todayM ? '#cbd5e1' : '#334155',
                  cursor: viewYear === todayY && viewMonth <= todayM ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={18} />
              </button>

              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </strong>

              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#334155',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekdays Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
              {WEEKDAY_NAMES.map((d) => (
                <span key={d} style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {/* Empty offset spaces */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = date === dateKey;
                const isPast =
                  viewYear < todayY ||
                  (viewYear === todayY && viewMonth < todayM) ||
                  (viewYear === todayY && viewMonth === todayM && dayNum < todayD);
                const isCurrentToday = viewYear === todayY && viewMonth === todayM && dayNum === todayD;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      onDateChange(dateKey);
                      setIsDateOpen(false);
                    }}
                    style={{
                      height: '34px',
                      borderRadius: '8px',
                      border: isCurrentToday && !isSelected ? '1px solid #fdba74' : 'none',
                      background: isSelected ? '#ed6b24' : isCurrentToday ? '#fff7ed' : 'transparent',
                      color: isSelected ? '#ffffff' : isPast ? '#cbd5e1' : '#0f172a',
                      fontWeight: isSelected || isCurrentToday ? 700 : 500,
                      fontSize: '13px',
                      cursor: isPast ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.1s',
                    }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= TIME PICKER ================= */}
      <div style={{ position: 'relative' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#1e293b' }}>
          Pickup Time <span style={{ color: '#ef4444' }}>*</span>
        </label>

        <button
          type="button"
          onClick={() => {
            setIsTimeOpen(!isTimeOpen);
            setIsDateOpen(false);
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '10px',
            border: isTimeOpen ? '2px solid #ed6b24' : '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            color: time ? '#0f172a' : '#94a3b8',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: isTimeOpen ? '0 0 0 3px rgba(237, 107, 36, 0.15)' : 'none',
            outline: 'none',
            transition: 'all 0.15s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} style={{ color: '#ed6b24', flexShrink: 0 }} />
            <span>{formatDisplayTime(time)}</span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>▼</span>
        </button>

        {/* Time Popover */}
        {isTimeOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '340px',
              maxWidth: '92vw',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.16), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
              padding: '16px',
              zIndex: 99999,
            }}
          >
            {/* Time Filter Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {(['all', 'morning', 'afternoon', 'evening', 'night'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setTimeFilter(period)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: timeFilter === period ? '#ed6b24' : '#e2e8f0',
                    background: timeFilter === period ? '#ffedd5' : '#f8fafc',
                    color: timeFilter === period ? '#c2410c' : '#64748b',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Time Grid (15-min intervals) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                maxHeight: '220px',
                overflowY: 'auto',
                padding: '2px',
              }}
            >
              {filteredTimeSlots.map((slot) => {
                const isSelected = time === slot;
                const past = isTimeInPast(slot);

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={past}
                    onClick={() => {
                      onTimeChange(slot);
                      setIsTimeOpen(false);
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #ed6b24' : '1px solid #e2e8f0',
                      background: isSelected ? '#ed6b24' : past ? '#f8fafc' : '#ffffff',
                      color: isSelected ? '#ffffff' : past ? '#cbd5e1' : '#0f172a',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '13px',
                      cursor: past ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      opacity: past ? 0.45 : 1,
                      transition: 'all 0.1s',
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              🕒 24-hour service • Times earlier than 45 mins from now are disabled for today
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
