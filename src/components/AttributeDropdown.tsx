/**
 * src/components/AttributeDropdown.tsx
 *
 * Reusable Neobrutalist Attribute Accordion for Class, Element, Rarity, and Series.
 * - Accordion style: expands inline within the card layout (no floating popovers or clipping)
 * - Scrollable option list limited to 3 items at a time (~115px max-height) with smooth internal scroll
 * - Shows checkmark and yellow fill on selected option
 * - Search filter box when options count > 6
 * - Dashed "+ Add [Field]" button with inline creator
 * - Element options carry and display colors (color wheel + swatches + hex input)
 * - Rarity options format star displays in amber
 * - Inline rename and delete with in-use confirmation
 */

import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BORDER,
  CREAM,
  INK,
  RADIUS,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { AttributeOption, AttributeType } from '../types/models';
import BrutalButton from './brutal/BrutalButton';
import BrutalTextInput from './brutal/BrutalTextInput';
import { Icon, ICONS } from './Icon';

const COLOR_WHEEL_HUES = [
  '#FF3B30', '#FF7A00', '#FFCC00', '#FFEB3B',
  '#A3E635', '#22C55E', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#18181B',
];

const PRESET_SWATCHES = [
  '#4ECDC4', '#FFD93D', '#FF6B6B', '#FF9F5A',
  '#B59CDD', '#38BDF8', '#6BCB77', '#141414',
];

export interface AttributeDropdownProps {
  label: string; // e.g. "CLASS", "ELEMENT", "RARITY", "SERIES"
  attributeType: AttributeType;
  value: string; // ID or legacy name
  options: AttributeOption[];
  isEditing: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'left' | 'right';
  onSelect: (option: AttributeOption) => void;
  onAddOption: (name: string, color?: string) => void;
  onRenameOption: (id: string, newName: string, newColor?: string) => void;
  onDeleteOption: (id: string) => void;
  isOptionInUse?: (option: AttributeOption) => boolean;
}

export const AttributeDropdown: React.FC<AttributeDropdownProps> = ({
  label,
  attributeType,
  value,
  options,
  isEditing,
  isOpen: isOpenProp,
  onOpenChange,
  onSelect,
  onAddOption,
  onRenameOption,
  onDeleteOption,
  isOptionInUse,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof isOpenProp === 'boolean';
  const isOpen = isControlled ? isOpenProp : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Add Option Mode
  const [isAdding, setIsAdding] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionColor, setNewOptionColor] = useState('#4ECDC4');

  // Edit Option Mode
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editOptionName, setEditOptionName] = useState('');
  const [editOptionColor, setEditOptionColor] = useState('#4ECDC4');

  // Delete Confirmation Mode
  const [deletingOption, setDeletingOption] = useState<AttributeOption | null>(null);

  // Match current selected option
  const currentOption = useMemo(() => {
    if (!value) return null;
    return (
      options.find(
        o => o.id === value || o.name.toLowerCase() === value.toLowerCase()
      ) ?? { id: value, name: value, color: attributeType === 'element' ? '#4ECDC4' : undefined }
    );
  }, [options, value, attributeType]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    return options.filter(o =>
      o.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [options, searchQuery]);

  const handleToggle = () => {
    if (!isEditing) return;
    const nextState = !isOpen;
    if (nextState) {
      setSearchQuery('');
      setIsAdding(false);
      setEditingOptionId(null);
      setDeletingOption(null);
    }
    setIsOpen(nextState);
  };

  const handleSelectOption = (option: AttributeOption) => {
    onSelect(option);
  };

  const handleConfirmAdd = () => {
    if (!newOptionName.trim()) return;
    onAddOption(newOptionName.trim(), attributeType === 'element' ? newOptionColor : undefined);
    setNewOptionName('');
    setIsAdding(false);
  };

  const handleStartEdit = (option: AttributeOption) => {
    setEditingOptionId(option.id);
    setEditOptionName(option.name);
    setEditOptionColor(option.color || '#4ECDC4');
    setIsAdding(false);
    setDeletingOption(null);
  };

  const handleConfirmEdit = (id: string) => {
    if (!editOptionName.trim()) return;
    onRenameOption(
      id,
      editOptionName.trim(),
      attributeType === 'element' ? editOptionColor : undefined
    );
    setEditingOptionId(null);
  };

  const handleDeletePress = (option: AttributeOption) => {
    const inUse = isOptionInUse ? isOptionInUse(option) : false;
    if (inUse) {
      setDeletingOption(option);
    } else {
      onDeleteOption(option.id);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingOption) return;
    onDeleteOption(deletingOption.id);
    setDeletingOption(null);
  };

  // ── View Mode: Clean static display ──────────────────────────────
  if (!isEditing) {
    if (attributeType === 'element') {
      const elementColor = currentOption?.color || '#FFD93D';
      return (
        <View>
          <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">
            {label}
          </Text>
          <View className="flex-row items-center gap-2">
            <View
              className="w-3.5 h-3.5 rounded-full border border-ink"
              style={{ backgroundColor: elementColor }}
            />
            <Text className="font-display text-[14px] font-extrabold text-ink">
              {currentOption?.name || 'None'}
            </Text>
          </View>
        </View>
      );
    }

    if (attributeType === 'rarity') {
      return (
        <View>
          <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">
            {label}
          </Text>
          <Text className="font-display text-[14px] font-extrabold text-[#B45309]">
            {currentOption?.name || 'None'}
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">
          {label}
        </Text>
        <Text className="font-display text-[14px] font-extrabold text-ink">
          {currentOption?.name || 'None'}
        </Text>
      </View>
    );
  }

  // ── Edit Mode: Inline Neobrutalist Accordion ─────────────────────
  return (
    <View className="w-full">
      <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">
        {label}
      </Text>

      {/* Accordion Header / Trigger Button */}
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.8}
        className={`flex-row items-center justify-between border-2 border-ink rounded-button px-2.5 h-[36px] ${
          isOpen ? 'bg-[#FFF8E7]' : 'bg-white'
        }`}
      >
        <View className="flex-row items-center gap-2 flex-1 pr-2">
          {attributeType === 'element' && (
            <View
              className="w-3.5 h-3.5 rounded-full border border-ink"
              style={{ backgroundColor: currentOption?.color || '#FFD93D' }}
            />
          )}
          <Text
            numberOfLines={1}
            className={`font-display text-[13px] font-extrabold ${
              attributeType === 'rarity' ? 'text-[#B45309]' : 'text-ink'
            }`}
          >
            {currentOption?.name || `Select ${label}...`}
          </Text>
        </View>
        <Text className="font-display text-[9px] font-black text-ink tracking-wider">
          {isOpen ? '▲ CLOSE' : '▼ CHOOSE'}
        </Text>
      </TouchableOpacity>

      {/* Accordion Expanded Panel (Flow layout: no clipping, naturally pushes rows down) */}
      {isOpen && (
        <View className="mt-2 p-2.5 rounded-button border-2 border-ink bg-white">
          {/* Search box if > 6 options */}
          {options.length > 6 && (
            <View className="mb-2">
              <BrutalTextInput
                size="sm"
                variant="single"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`Search ${label.toLowerCase()}...`}
                style={{ fontSize: 11, height: 28 }}
              />
            </View>
          )}

          {/* Delete in-use confirmation notice */}
          {deletingOption && (
            <View className="mb-2 p-2 rounded-small border-2 border-ink bg-[#FEE2E2]">
              <Text className="font-display text-[10px] font-bold text-[#991B1B] mb-1">
                ⚠️ OPTION IN USE
              </Text>
              <Text className="font-body text-[10px] text-[#7F1D1D] mb-2 leading-4">
                "{deletingOption.name}" is used by entries in this project. Deleting it will clear it from those entries.
              </Text>
              <View className="flex-row gap-1.5 justify-end">
                <BrutalButton
                  label="CANCEL"
                  size="sm"
                  variant="secondary"
                  onPress={() => setDeletingOption(null)}
                />
                <BrutalButton
                  label="CONFIRM"
                  size="sm"
                  variant="primary"
                  accentColor="#DC2626"
                  onPress={handleConfirmDelete}
                />
              </View>
            </View>
          )}

          {/* Scrollable list of items, limited to ~3 items (~114px) */}
          <ScrollView
            style={{ maxHeight: 114 }}
            contentContainerStyle={{ gap: 4 }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {filteredOptions.length === 0 ? (
              <View className="py-2 items-center">
                <Text className="font-body text-[11px] text-[#888888]">
                  No matching options
                </Text>
              </View>
            ) : (
              filteredOptions.map(opt => {
                const isSelected =
                  currentOption?.id === opt.id ||
                  currentOption?.name.toLowerCase() === opt.name.toLowerCase();
                const isEditingThis = editingOptionId === opt.id;

                if (isEditingThis) {
                  return (
                    <View
                      key={opt.id}
                      className="p-2 rounded-button border-2 border-ink bg-[#FFFDF8]"
                    >
                      <Text className="font-display text-[9px] font-extrabold text-ink mb-1">
                        RENAME {label}
                      </Text>
                      <BrutalTextInput
                        size="sm"
                        variant="single"
                        value={editOptionName}
                        onChangeText={setEditOptionName}
                        style={{ fontSize: 11, fontWeight: '700', marginBottom: 4, height: 28 }}
                      />

                      {attributeType === 'element' && (
                        <View className="mb-1.5">
                          <Text className="font-display text-[9px] font-extrabold text-[#666666] mb-1">
                            COLOR
                          </Text>
                          <View className="flex-row flex-wrap gap-1 mb-1">
                            {PRESET_SWATCHES.map(color => (
                              <TouchableOpacity
                                key={color}
                                onPress={() => setEditOptionColor(color)}
                                className="w-4 h-4 rounded-small"
                                style={{
                                  backgroundColor: color,
                                  borderColor: editOptionColor === color ? INK : 'rgba(0,0,0,0.2)',
                                  borderWidth: editOptionColor === color ? 2 : 1,
                                }}
                              />
                            ))}
                          </View>
                          <BrutalTextInput
                            size="sm"
                            variant="single"
                            value={editOptionColor}
                            onChangeText={setEditOptionColor}
                            style={{ fontSize: 10, height: 24 }}
                          />
                        </View>
                      )}

                      <View className="flex-row justify-end gap-1">
                        <BrutalButton
                          label="CANCEL"
                          size="sm"
                          variant="secondary"
                          onPress={() => setEditingOptionId(null)}
                        />
                        <BrutalButton
                          label="SAVE"
                          size="sm"
                          variant="primary"
                          accentColor={YELLOW}
                          onPress={() => handleConfirmEdit(opt.id)}
                        />
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={opt.id}
                    className={`flex-row items-center justify-between px-2 py-1 rounded-small border border-ink ${
                      isSelected ? 'bg-yellow' : 'bg-cream'
                    }`}
                  >
                    <TouchableOpacity
                      onPress={() => handleSelectOption(opt)}
                      activeOpacity={0.7}
                      className="flex-row items-center gap-2 flex-1 py-0.5"
                    >
                      {attributeType === 'element' && (
                        <View
                          className="w-3 h-3 rounded-full border border-ink"
                          style={{ backgroundColor: opt.color || '#FFD93D' }}
                        />
                      )}
                      <Text
                        numberOfLines={1}
                        className={`font-display text-[11px] ${
                          isSelected ? 'font-black' : 'font-bold'
                        } ${attributeType === 'rarity' ? 'text-[#B45309]' : 'text-ink'}`}
                      >
                        {opt.name}
                      </Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center gap-1">
                      {isSelected && (
                        <Text className="font-display text-[11px] font-black text-ink mr-0.5">
                          ✓
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => handleStartEdit(opt)}
                        activeOpacity={0.7}
                        className="p-1"
                        accessibilityLabel="Edit option"
                      >
                        <Icon glyph={ICONS.edit} size={10} color="#555555" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeletePress(opt)}
                        activeOpacity={0.7}
                        className="p-1"
                        accessibilityLabel="Delete option"
                      >
                        <Icon glyph={ICONS.delete} size={10} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Divider */}
          <View className="my-2 border-t border-ink" />

          {/* Add Option section at bottom */}
          {isAdding ? (
            <View className="bg-white">
              <Text className="font-display text-[10px] font-extrabold text-ink mb-1">
                NEW {label}
              </Text>

              <BrutalTextInput
                size="sm"
                variant="single"
                value={newOptionName}
                onChangeText={setNewOptionName}
                placeholder={`Enter ${label.toLowerCase()} name...`}
                style={{ fontSize: 11, fontWeight: '700', marginBottom: 6, height: 28 }}
              />

              {attributeType === 'element' && (
                <View className="mb-2">
                  <Text className="font-display text-[9px] font-extrabold text-[#666666] mb-1">
                    CHOOSE ELEMENT COLOR
                  </Text>

                  {/* Circular wheel and swatches */}
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <View className="w-[64px] h-[64px] rounded-full bg-white border-2 border-ink relative items-center justify-center">
                      {COLOR_WHEEL_HUES.map((hue, index) => {
                        const total = COLOR_WHEEL_HUES.length;
                        const angle = (index * 2 * Math.PI) / total;
                        const radius = 24;
                        const x = 30 + radius * Math.cos(angle) - 7;
                        const y = 30 + radius * Math.sin(angle) - 7;
                        const isHueSelected = newOptionColor.toLowerCase() === hue.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={hue}
                            onPress={() => setNewOptionColor(hue)}
                            activeOpacity={0.7}
                            style={{
                              position: 'absolute',
                              width: 14,
                              height: 14,
                              borderRadius: 7,
                              backgroundColor: hue,
                              left: x,
                              top: y,
                              borderWidth: isHueSelected ? 2 : 1,
                              borderColor: INK,
                              zIndex: 2,
                            }}
                          />
                        );
                      })}
                      <View
                        className="w-5 h-5 rounded-full border border-ink items-center justify-center z-[3]"
                        style={{ backgroundColor: newOptionColor }}
                      />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row flex-wrap gap-1 mb-1">
                        {PRESET_SWATCHES.map(color => (
                          <TouchableOpacity
                            key={color}
                            onPress={() => setNewOptionColor(color)}
                            className="w-4 h-4 rounded-small"
                            style={{
                              backgroundColor: color,
                              borderColor: newOptionColor === color ? INK : 'rgba(0,0,0,0.2)',
                              borderWidth: newOptionColor === color ? 2 : 1,
                            }}
                          />
                        ))}
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Text className="font-display text-[9px] font-extrabold text-ink">HEX</Text>
                        <BrutalTextInput
                          size="sm"
                          variant="single"
                          value={newOptionColor}
                          onChangeText={setNewOptionColor}
                          style={{ fontSize: 10, height: 24, flex: 1 }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <View className="flex-row justify-end gap-1 mt-1">
                <BrutalButton
                  label="CANCEL"
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    setIsAdding(false);
                    setNewOptionName('');
                  }}
                />
                <BrutalButton
                  label={`+ ADD`}
                  size="sm"
                  variant="primary"
                  accentColor={YELLOW}
                  disabled={!newOptionName.trim()}
                  onPress={handleConfirmAdd}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setIsAdding(true);
                setEditingOptionId(null);
                setDeletingOption(null);
              }}
              activeOpacity={0.8}
              style={styles.dashedAddButton}
            >
              <Text className="font-display text-[10px] font-extrabold text-ink tracking-wide">
                + Add {label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dashedAddButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: RADIUS.button,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: INK,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AttributeDropdown;
