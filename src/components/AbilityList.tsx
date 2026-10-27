/**
 * src/components/AbilityList.tsx
 *
 * Neobrutalist Flexible Combat Kit:
 * - Dynamic Ability[] array support (Passive, Skill, Ultimate, Custom)
 * - Move up / down reordering
 * - Quick presets: + Add Skill, + Add Passive, + Add Ultimate, + Add Custom
 * - Quick templates: Standard (1P+3S+1U), Simple (1P+2S+1U), Fighting Game, Empty
 * - Optional fields: Cooldown and Cost / SP
 * - Inline Emoji selector with zero clipping in WinUI XAML
 */

import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BORDER,
  CREAM,
  INK,
  LAVENDER,
  ORANGE,
  RADIUS,
  SHADOW,
  TEAL,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Ability, AbilityType } from '../types/models';
import BrutalBox from './brutal/BrutalBox';
import BrutalButton from './brutal/BrutalButton';
import BrutalPill from './brutal/BrutalPill';
import BrutalTextInput from './brutal/BrutalTextInput';
import { Icon, ICONS } from './Icon';
import { AbilityIconTile } from './AbilityIconTile';
import { AbilityIconPicker } from './AbilityIconPicker';
import { MiniTipTapEditor } from './MiniTipTapEditor';
import { MiniRichTextView } from './MiniRichTextView';
import {
  DEFAULT_FIGHTING_GAME_ABILITIES,
  DEFAULT_SIMPLE_ABILITIES,
  DEFAULT_STANDARD_ABILITIES,
  createNewAbility,
} from '../utils/abilityUtils';

const TYPE_CONFIG: Record<
  AbilityType,
  { label: string; color: string; defaultEmoji: string }
> = {
  passive: { label: 'PASSIVE', color: YELLOW, defaultEmoji: '🛡️' },
  skill: { label: 'SKILL', color: TEAL, defaultEmoji: '⚡' },
  ultimate: { label: 'ULTIMATE', color: '#FF7A00', defaultEmoji: '☄️' },
  custom: { label: 'CUSTOM', color: LAVENDER, defaultEmoji: '✨' },
};

const ALL_TYPES: AbilityType[] = ['passive', 'skill', 'ultimate', 'custom'];

interface AbilityListProps {
  abilities: Ability[];
  onChange: (abilities: Ability[]) => void;
  isEditing: boolean;
  title?: string;
  isEvolution?: boolean;
}

export const AbilityList: React.FC<AbilityListProps> = ({
  abilities,
  onChange,
  isEditing,
  title = 'COMBAT KIT & ABILITIES',
  isEvolution = false,
}) => {
  const [activeIconTargetId, setActiveIconTargetId] = useState<string | null>(null);
  const [activeRichDescId, setActiveRichDescId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const toggleDetails = (id: string) => {
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...abilities];
    const item = next[index];
    next[index] = next[index - 1];
    next[index - 1] = item;
    onChange(next);
  };

  const handleMoveDown = (index: number) => {
    if (index >= abilities.length - 1) return;
    const next = [...abilities];
    const item = next[index];
    next[index] = next[index + 1];
    next[index + 1] = item;
    onChange(next);
  };

  const handleAddPreset = (type: AbilityType) => {
    const existingCount = abilities.filter(a => a.type === type).length;
    const newItem = createNewAbility(type, existingCount + 1);
    onChange([...abilities, newItem]);
  };

  const handleRemove = (id: string) => {
    onChange(abilities.filter(a => a.id !== id));
    if (activeIconTargetId === id) setActiveIconTargetId(null);
  };

  const handleUpdate = (id: string, patch: Partial<Ability>) => {
    onChange(
      abilities.map(a => {
        if (a.id !== id) return a;
        return { ...a, ...patch };
      })
    );
  };

  const handleApplyTemplate = (templateKey: 'standard' | 'simple' | 'fighting' | 'empty') => {
    let nextAbilities: Ability[] = [];
    if (templateKey === 'standard') {
      nextAbilities = DEFAULT_STANDARD_ABILITIES.map(a => ({
        ...a,
        id: `ab-std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }));
    } else if (templateKey === 'simple') {
      nextAbilities = DEFAULT_SIMPLE_ABILITIES.map(a => ({
        ...a,
        id: `ab-smp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }));
    } else if (templateKey === 'fighting') {
      nextAbilities = DEFAULT_FIGHTING_GAME_ABILITIES.map(a => ({
        ...a,
        id: `ab-fg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }));
    } else if (templateKey === 'empty') {
      nextAbilities = [];
    }
    onChange(nextAbilities);
    setShowTemplates(false);
  };

  return (
    <View className="w-full">
      {/* ── Section Header ─────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between pb-2 mb-3 border-b-2 border-ink">
        <View className="flex-row items-center gap-2">
          <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">
            {title.toUpperCase()}
          </Text>
          <View className="px-2 py-0.5 rounded-small border border-ink bg-white">
            <Text className="font-display text-[10px] font-extrabold text-[#555555]">
              {abilities.length} {abilities.length === 1 ? 'ABILITY' : 'ABILITIES'}
            </Text>
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity
            onPress={() => setShowTemplates(!showTemplates)}
            className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-small border border-ink bg-cream"
            activeOpacity={0.8}
          >
            <Text className="font-display text-[10px] font-extrabold text-ink">
              TEMPLATES {showTemplates ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Inline Quick Templates Panel ───────────────────────────── */}
      {isEditing && showTemplates && (
        <View className="p-3 mb-4 rounded-button border-2 border-ink bg-cream">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-display text-[11px] font-extrabold text-ink tracking-wider">
              APPLY ABILITY KIT TEMPLATE:
            </Text>
            <TouchableOpacity onPress={() => setShowTemplates(false)}>
              <Text className="font-display text-[10px] font-extrabold text-ink">✕ CLOSE</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => handleApplyTemplate('standard')}
              className="px-3 py-1.5 rounded-small border-2 border-ink bg-white"
              activeOpacity={0.8}
            >
              <Text className="font-display text-[11px] font-extrabold text-ink">
                Standard (1P + 3S + 1U)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleApplyTemplate('simple')}
              className="px-3 py-1.5 rounded-small border-2 border-ink bg-white"
              activeOpacity={0.8}
            >
              <Text className="font-display text-[11px] font-extrabold text-ink">
                Simple (1P + 2S + 1U)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleApplyTemplate('fighting')}
              className="px-3 py-1.5 rounded-small border-2 border-ink bg-white"
              activeOpacity={0.8}
            >
              <Text className="font-display text-[11px] font-extrabold text-ink">
                Fighting Game
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleApplyTemplate('empty')}
              className="px-3 py-1.5 rounded-small border-2 border-ink bg-[#FFF0F0]"
              activeOpacity={0.8}
            >
              <Text className="font-display text-[11px] font-extrabold text-[#D32F2F]">
                Custom Empty
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Ability Rows List ──────────────────────────────────────── */}
      {abilities.length === 0 ? (
        <View className="py-6 px-4 rounded-card border-2 border-dashed border-ink bg-cream items-center justify-center mb-3">
          <Text className="font-display text-[12px] font-extrabold text-ink">
            NO ABILITIES CONFIGURED
          </Text>
          <Text className="font-body text-[11px] text-[#666666] text-center mt-1">
            {isEditing
              ? 'Use the preset buttons below or choose a template to add combat abilities.'
              : 'This unit does not have any combat skills assigned.'}
          </Text>
        </View>
      ) : (
        <View className="gap-2.5 mb-3">
          {abilities.map((ability, index) => {
            const config = TYPE_CONFIG[ability.type] || TYPE_CONFIG.custom;
            const isUltimate = ability.type === 'ultimate';
            const showDetailInputs = expandedDetails[ability.id] || Boolean(ability.cost || ability.cooldown);

            const isRichEditing = activeRichDescId === ability.id;

            if (isEditing) {
              return (
                <View
                  key={ability.id}
                  className="p-3.5 rounded-card border-2 border-ink"
                  style={{
                    backgroundColor: isUltimate ? `${YELLOW}14` : WHITE,
                  }}
                >
                  <View className="flex-row items-start gap-3.5">
                    {/* ── Left Column: Reordering + Big Prominent Icon Tile ── */}
                    <View className="items-center gap-1.5 pt-0.5">
                      {/* Reorder Buttons */}
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="w-[20px] h-[16px] rounded-small border border-ink bg-white items-center justify-center"
                          style={{ opacity: index === 0 ? 0.3 : 1 }}
                        >
                          <Text className="text-[9px] font-extrabold text-ink leading-[10px]">▲</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleMoveDown(index)}
                          disabled={index === abilities.length - 1}
                          className="w-[20px] h-[16px] rounded-small border border-ink bg-white items-center justify-center"
                          style={{ opacity: index === abilities.length - 1 ? 0.3 : 1 }}
                        >
                          <Text className="text-[9px] font-extrabold text-ink leading-[10px]">▼</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Prominent Game Icon / Tile Button (56x56) */}
                      <TouchableOpacity
                        onPress={() =>
                          setActiveIconTargetId(
                            activeIconTargetId === ability.id ? null : ability.id
                          )
                        }
                        activeOpacity={0.8}
                        style={{ position: 'relative' }}
                      >
                        <AbilityIconTile
                          icon={ability.icon}
                          iconBg={ability.iconBg}
                          iconColor={ability.iconColor}
                          iconType={ability.iconType}
                          emoji={ability.emoji || config.defaultEmoji}
                          size={56}
                          radius={RADIUS.small}
                          borderWidth={2}
                        />
                        <View
                          style={{
                            position: 'absolute',
                            bottom: -3,
                            right: -3,
                            backgroundColor: WHITE,
                            borderWidth: 1.5,
                            borderColor: INK,
                            borderRadius: 10,
                            width: 18,
                            height: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 9 }}>🎨</Text>
                        </View>
                      </TouchableOpacity>
                      <Text className="font-display text-[9px] font-bold text-[#888888]">
                        SET ICON
                      </Text>
                    </View>

                    {/* ── Right Column: Name, Badges, Details, Description ── */}
                    <View className="flex-1">
                      {/* Top Row: Type Pills, Name Input, CD Toggle, Delete */}
                      <View className="flex-row items-center gap-2 mb-2">
                        {/* Type Pills Selector */}
                        <View className="flex-row items-center gap-1 border border-ink rounded-small p-0.5 bg-neutral-100">
                          {ALL_TYPES.map(t => {
                            const tConfig = TYPE_CONFIG[t];
                            const isSelected = ability.type === t;
                            return (
                              <TouchableOpacity
                                key={t}
                                onPress={() => handleUpdate(ability.id, { type: t })}
                                className="px-1.5 py-0.5 rounded-small"
                                style={{
                                  backgroundColor: isSelected ? tConfig.color : 'transparent',
                                  borderWidth: isSelected ? 1 : 0,
                                  borderColor: INK,
                                }}
                                activeOpacity={0.7}
                              >
                                <Text
                                  className="font-display text-[9px] font-extrabold"
                                  style={{ color: isSelected ? INK : '#666666' }}
                                >
                                  {tConfig.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Ability Name Input */}
                        <BrutalTextInput
                          variant="single"
                          size="sm"
                          borderWidth={1}
                          value={ability.name}
                          onChangeText={val => handleUpdate(ability.id, { name: val })}
                          placeholder="Ability name..."
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: '800',
                            borderRadius: RADIUS.small,
                          }}
                        />

                        {/* CD / Cost Details Toggle */}
                        <TouchableOpacity
                          onPress={() => toggleDetails(ability.id)}
                          className="px-2 py-1.5 rounded-small border border-ink bg-cream items-center justify-center"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[9px] font-extrabold text-ink">
                            {showDetailInputs ? 'CLOSE' : 'CD/COST'}
                          </Text>
                        </TouchableOpacity>

                        {/* Delete Ability Button */}
                        <TouchableOpacity
                          onPress={() => handleRemove(ability.id)}
                          className="w-[28px] h-[28px] rounded-small border border-ink bg-[#FFF0F0] items-center justify-center"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[12px] font-extrabold text-[#D32F2F]">✕</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Optional Cooldown & Cost Inputs */}
                      {showDetailInputs && (
                        <View className="flex-row items-center gap-3 p-2 mb-2 rounded-small border border-dashed border-ink bg-cream">
                          <View className="flex-1 flex-row items-center gap-1.5">
                            <Text className="font-display text-[10px] font-extrabold text-ink">COOLDOWN:</Text>
                            <BrutalTextInput
                              variant="single"
                              size="sm"
                              borderWidth={1}
                              value={ability.cooldown || ''}
                              onChangeText={val => handleUpdate(ability.id, { cooldown: val })}
                              placeholder="e.g. 30s or 3 turns"
                              style={{ flex: 1, fontSize: 11, borderRadius: RADIUS.small }}
                            />
                          </View>
                          <View className="flex-1 flex-row items-center gap-1.5">
                            <Text className="font-display text-[10px] font-extrabold text-ink">⚡ COST / SP:</Text>
                            <BrutalTextInput
                              variant="single"
                              size="sm"
                              borderWidth={1}
                              value={ability.cost || ''}
                              onChangeText={val => handleUpdate(ability.id, { cost: val })}
                              placeholder="e.g. 50 SP or 2 Points"
                              style={{ flex: 1, fontSize: 11, borderRadius: RADIUS.small }}
                            />
                          </View>
                        </View>
                      )}

                      {/* Description Area: Side by Side with Icon */}
                      {isRichEditing ? (
                        <View className="gap-1">
                          <View className="flex-row items-center justify-between pb-0.5">
                            <Text className="font-display text-[10px] font-extrabold text-ink">
                              RICH TEXT FORMATTER
                            </Text>
                            <TouchableOpacity
                              onPress={() => setActiveRichDescId(null)}
                              className="px-2 py-0.5 rounded-small border border-ink bg-[#FFD93D]"
                              activeOpacity={0.8}
                            >
                              <Text className="font-display text-[9px] font-extrabold text-ink">
                                ✓ DONE
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <MiniTipTapEditor
                            value={ability.desc}
                            onChange={val => handleUpdate(ability.id, { desc: val })}
                            minHeight={70}
                            maxHeight={160}
                            compact
                            placeholder="Enter ability description and combat multipliers..."
                          />
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => setActiveRichDescId(ability.id)}
                          activeOpacity={0.85}
                          style={{
                            minHeight: 56,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: RADIUS.small,
                            borderWidth: 1,
                            borderColor: INK,
                            backgroundColor: WHITE,
                            position: 'relative',
                            justifyContent: 'center',
                          }}
                        >
                          <MiniRichTextView
                            content={ability.desc || 'Tap to enter ability description...'}
                            style={{
                              fontSize: 14,
                              lineHeight: 22,
                              color: ability.desc ? '#1F2937' : '#9CA3AF',
                            }}
                          />
                          <View
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: RADIUS.small,
                              borderWidth: 1,
                              borderColor: INK,
                              backgroundColor: '#FFF4D6',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <Text className="font-display text-[9px] font-extrabold text-ink">
                              EDIT
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Inline Game Icon & Tile Designer (Dropdown underneath card) */}
                  {activeIconTargetId === ability.id && (
                    <View className="mt-3 pt-3 border-t-2 border-ink">
                      <AbilityIconPicker
                        initialIcon={ability.icon}
                        initialIconBg={ability.iconBg}
                        initialIconColor={ability.iconColor}
                        initialIconType={ability.iconType}
                        initialEmoji={ability.emoji || config.defaultEmoji}
                        onApply={(res) => {
                          handleUpdate(ability.id, {
                            icon: res.icon,
                            emoji: res.emoji,
                            iconType: res.iconType,
                            iconBg: res.iconBg,
                            iconColor: res.iconColor,
                          });
                          setActiveIconTargetId(null);
                        }}
                        onClose={() => setActiveIconTargetId(null)}
                      />
                    </View>
                  )}
                </View>
              );
            }

            // View Mode: Side by Side (Icon on Left, Name & Description on Right)
            return (
              <View
                key={ability.id}
                className="p-3.5 rounded-button border-2 border-ink"
                style={{
                  backgroundColor: isUltimate ? `${YELLOW}18` : WHITE,
                }}
              >
                <View className="flex-row items-start gap-3.5">
                  {/* Left Column: Prominent 56x56 Icon Tile */}
                  <AbilityIconTile
                    icon={ability.icon}
                    iconBg={ability.iconBg}
                    iconColor={ability.iconColor}
                    iconType={ability.iconType}
                    emoji={ability.emoji || config.defaultEmoji}
                    size={56}
                    radius={RADIUS.small}
                    borderWidth={2}
                  />

                  {/* Right Column: Name & Badges + Big Description */}
                  <View className="flex-1">
                    {/* Top Row: Type Pill, Name, Badges */}
                    <View className="flex-row items-center gap-2 mb-1.5">
                      {/* Type Pill */}
                      <BrutalPill label={config.label} fill={config.color} size="sm" />

                      {/* Ability Name */}
                      <Text className="font-display text-[15px] font-extrabold text-ink tracking-tight flex-1">
                        {ability.name.toUpperCase()}
                      </Text>

                      {/* Optional Cooldown Badge */}
                      {ability.cooldown ? (
                        <View className="px-2 py-0.5 rounded-small border border-ink bg-white">
                          <Text className="font-display text-[10px] font-extrabold text-ink">
                            ⏱ {ability.cooldown}
                          </Text>
                        </View>
                      ) : null}

                      {/* Optional Cost Badge */}
                      {ability.cost ? (
                        <View className="px-2 py-0.5 rounded-small border border-ink bg-[#FFF4D6]">
                          <Text className="font-display text-[10px] font-extrabold text-ink">
                            ⚡ {ability.cost}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Description: Big, Readable Text (14px font, 22px line height) */}
                    <MiniRichTextView
                      content={ability.desc || 'No description provided.'}
                      style={{ fontSize: 14, color: '#1F2937', lineHeight: 22 }}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Preset Add Buttons (Edit Mode Only) ────────────────────── */}
      {isEditing && (
        <View className="flex-row flex-wrap items-center gap-2 pt-2 border-t border-ink">
          <BrutalButton
            label="+ ADD SKILL"
            variant="secondary"
            accentColor={TEAL}
            size="sm"
            onPress={() => handleAddPreset('skill')}
          />
          <BrutalButton
            label="+ ADD PASSIVE"
            variant="secondary"
            accentColor={YELLOW}
            size="sm"
            onPress={() => handleAddPreset('passive')}
          />
          <BrutalButton
            label="+ ADD ULTIMATE"
            variant="secondary"
            accentColor="#FF7A00"
            size="sm"
            onPress={() => handleAddPreset('ultimate')}
          />
          <BrutalButton
            label="+ ADD CUSTOM"
            variant="secondary"
            accentColor={LAVENDER}
            size="sm"
            onPress={() => handleAddPreset('custom')}
          />
        </View>
      )}
    </View>
  );
};

export default AbilityList;
