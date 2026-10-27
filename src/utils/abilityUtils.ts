/**
 * src/utils/abilityUtils.ts
 *
 * Helpers, presets, and migration utilities for flexible combat abilities.
 */

import type { Ability, AbilityType } from '../types/models';

export const DEFAULT_STANDARD_ABILITIES: Ability[] = [
  {
    id: 'ab-passive-default',
    type: 'passive',
    name: "Friend Ability — Hunter's Mark",
    desc: 'Ally Pierce units deal +20% damage to bosses and elite targets.',
    icon: 'shield',
    iconBg: '#141414',
    iconColor: '#FFD93D',
    emoji: '🛡️',
  },
  {
    id: 'ab-skill-1-default',
    type: 'skill',
    name: 'Skill 1 — Celestial Arrow (Permanent)',
    desc: 'Every 30 seconds, the next basic attack deals 150% physical damage in a direct line.',
    icon: 'energy_arrow',
    iconBg: '#141414',
    iconColor: '#4ECDC4',
    emoji: '⚡',
  },
  {
    id: 'ab-skill-2-default',
    type: 'skill',
    name: 'Skill 2 — Dark Cadenza',
    desc: 'Ignores deployment limits for 10s and enhances all primary summon attributes.',
    icon: 'vortex',
    iconBg: '#141414',
    iconColor: '#4ECDC4',
    emoji: '🌀',
    cooldown: '30s',
  },
  {
    id: 'ab-skill-3-default',
    type: 'skill',
    name: 'Skill 3 — Final Answer',
    desc: 'Instantly redeploys, gains a shield equal to 200% max HP, and all damage converts to True Damage.',
    icon: 'supernova',
    iconBg: '#141414',
    iconColor: '#FF7A00',
    emoji: '💥',
    cooldown: '60s',
  },
  {
    id: 'ab-ultimate-default',
    type: 'ultimate',
    name: 'Ultimate — Constellation Requiem / Stellar Supernova',
    desc: 'Charges for 2 turns to unleash an omnidirectional starburst beam that clears the screen of hazards and deals 500% True Damage.',
    icon: 'stars_stack',
    iconBg: '#141414',
    iconColor: '#FFD93D',
    emoji: '☄️',
    cost: '100 SP',
  },
];

export const DEFAULT_SIMPLE_ABILITIES: Ability[] = [
  {
    id: 'ab-simple-passive',
    type: 'passive',
    name: 'Combat Trait — Battle Instincts',
    desc: 'Passively increases movement speed by 15% and critical strike chance by 10%.',
    icon: 'skills',
    iconBg: '#141414',
    iconColor: '#FFD93D',
    emoji: '🛡️',
  },
  {
    id: 'ab-simple-skill-1',
    type: 'skill',
    name: 'Primary Skill — Radiant Cleave',
    desc: 'Delivers a sweeping arc attack dealing 180% physical damage to all enemies in front.',
    icon: 'broadsword',
    iconBg: '#141414',
    iconColor: '#4ECDC4',
    emoji: '⚡',
    cooldown: '8s',
  },
  {
    id: 'ab-simple-skill-2',
    type: 'skill',
    name: 'Secondary Skill — Barrier Dash',
    desc: 'Dashes forward through targets and generates a protective barrier for 4s.',
    icon: 'sprint',
    iconBg: '#141414',
    iconColor: '#4ECDC4',
    emoji: '🌀',
    cooldown: '14s',
  },
  {
    id: 'ab-simple-ultimate',
    type: 'ultimate',
    name: 'Ultimate — Cataclysmic Impact',
    desc: 'Leaps into the air and crashes down, creating a shockwave dealing massive true damage and stunning targets.',
    icon: 'meteor_impact',
    iconBg: '#141414',
    iconColor: '#FF7A00',
    emoji: '☄️',
    cost: '100 SP',
  },
];

export const DEFAULT_FIGHTING_GAME_ABILITIES: Ability[] = [
  {
    id: 'ab-fg-passive',
    type: 'passive',
    name: 'V-Skill / Trait — Counter Stance',
    desc: 'Parrying an incoming blow within 0.2s completely negates damage and opens up counter-hit frames.',
    icon: 'punch',
    iconBg: '#141414',
    iconColor: '#FFD93D',
    emoji: '🥊',
  },
  {
    id: 'ab-fg-skill-1',
    type: 'skill',
    name: 'Normal String — Triple Rush Combo',
    desc: 'Quick 3-hit jab, body blow, and high kick combo string cancelable into special moves.',
    icon: 'fist',
    iconBg: '#141414',
    iconColor: '#4ECDC4',
    emoji: '⚡',
  },
  {
    id: 'ab-fg-skill-2',
    type: 'skill',
    name: 'Special Move — Spiral Dragon Uppercut',
    desc: 'Anti-air spinning strike with invulnerability on startup (623 + Punch).',
    icon: 'tornado',
    iconBg: '#141414',
    iconColor: '#4ECDC4',
    emoji: '🌪️',
  },
  {
    id: 'ab-fg-skill-3',
    type: 'skill',
    name: 'EX Move — Overdrive Blastwave',
    desc: 'Consumes 1 meter bar to fire an armor-breaking wall-bounce projectile (236 + EX).',
    icon: 'power_lightning',
    iconBg: '#141414',
    iconColor: '#FF7A00',
    emoji: '💥',
    cost: '1 Bar',
  },
  {
    id: 'ab-fg-ultimate',
    type: 'ultimate',
    name: 'Critical Art — Final Divine Destroyer',
    desc: 'Cinema-quality cinematic super combo dealing colossal damage when health is below 30%.',
    icon: 'flame',
    iconBg: '#141414',
    iconColor: '#FF4757',
    emoji: '🔥',
    cost: '3 Bars',
  },
];

export const DEFAULT_EVOLUTION_ABILITIES: Ability[] = [
  {
    id: 'evo-ab-passive',
    type: 'passive',
    name: "Transcended Ability — Hunter's True Domain",
    desc: 'Ally Pierce units deal +40% damage and penetrate divine shielding.',
    icon: 'magic_shield',
    iconBg: '#141414',
    iconColor: '#FFD93D',
    emoji: '🛡️',
  },
  {
    id: 'evo-ab-skill-1',
    type: 'skill',
    name: 'Awakened Skill 1 — Celestial Hyper Arrow',
    desc: 'Basic attack fires a hyper-beam piercing all enemies in a line for 280% damage.',
    icon: 'plasma_bolt',
    iconBg: '#141414',
    iconColor: '#4ECDC4',
    emoji: '⚡',
  },
  {
    id: 'evo-ab-skill-2',
    type: 'skill',
    name: 'Awakened Skill 2 — Astral Singularity',
    desc: 'Creates an imploding black hole that clusters and stuns all enemies for 3 seconds.',
    icon: 'black_hole_bolas',
    iconBg: '#141414',
    iconColor: '#4ECDC4',
    emoji: '🌀',
    cooldown: '25s',
  },
  {
    id: 'evo-ab-skill-3',
    type: 'skill',
    name: 'Awakened Skill 3 — Supernova Resonator',
    desc: 'Surges team energy by 100% and resets skill cooldowns upon boss break.',
    icon: 'supernova',
    iconBg: '#141414',
    iconColor: '#FF7A00',
    emoji: '💥',
    cooldown: '45s',
  },
  {
    id: 'evo-ab-ultimate',
    type: 'ultimate',
    name: 'Awakened Ultimate — Genesis Oblivion Buster',
    desc: 'Unleashes absolute celestial firestorm dealing 600% screen-wide elemental burst.',
    icon: 'two_handed_sword',
    iconBg: '#141414',
    iconColor: '#FFD93D',
    emoji: '⚔️',
    cost: '120 SP',
  },
];

/**
 * Migrates legacy hardcoded abilities (passive*, skill1*, skill2*, skill3*, ultimate*)
 * into a clean Ability[] array with zero data loss.
 */
export function migrateAbilities(source: any, defaultAbilities: Ability[] = []): Ability[] {
  if (Array.isArray(source?.abilities) && source.abilities.length > 0) {
    return source.abilities;
  }
  // Check if legacy fields exist on source
  const hasLegacy =
    source?.passiveName ||
    source?.skill1Name ||
    source?.skill2Name ||
    source?.skill3Name ||
    source?.ultimateName ||
    source?.passiveDesc ||
    source?.skill1Desc ||
    source?.skill2Desc ||
    source?.skill3Desc ||
    source?.ultimateDesc;

  if (hasLegacy) {
    const list: Ability[] = [];
    if (source.passiveName || source.passiveDesc) {
      list.push({
        id: `ab-migrated-passive-${Date.now()}-1`,
        type: 'passive',
        name: source.passiveName || 'Passive Ability',
        desc: source.passiveDesc || '',
        emoji: source.passiveEmoji || '🛡️',
      });
    }
    if (source.skill1Name || source.skill1Desc) {
      list.push({
        id: `ab-migrated-skill1-${Date.now()}-2`,
        type: 'skill',
        name: source.skill1Name || 'Skill 1',
        desc: source.skill1Desc || '',
        emoji: source.skill1Emoji || '⚡',
      });
    }
    if (source.skill2Name || source.skill2Desc) {
      list.push({
        id: `ab-migrated-skill2-${Date.now()}-3`,
        type: 'skill',
        name: source.skill2Name || 'Skill 2',
        desc: source.skill2Desc || '',
        emoji: source.skill2Emoji || '🌀',
      });
    }
    if (source.skill3Name || source.skill3Desc) {
      list.push({
        id: `ab-migrated-skill3-${Date.now()}-4`,
        type: 'skill',
        name: source.skill3Name || 'Skill 3',
        desc: source.skill3Desc || '',
        emoji: source.skill3Emoji || '💥',
      });
    }
    if (source.ultimateName || source.ultimateDesc) {
      list.push({
        id: `ab-migrated-ultimate-${Date.now()}-5`,
        type: 'ultimate',
        name: source.ultimateName || 'Ultimate Ability',
        desc: source.ultimateDesc || '',
        emoji: source.ultimateEmoji || '☄️',
      });
    }
    if (list.length > 0) {
      return list;
    }
  }

  // Deep copy defaults to ensure clean ids
  return defaultAbilities.map(a => ({ ...a, id: `${a.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
}

/**
 * Factory to create a new ability item with sensible defaults per type.
 */
export function createNewAbility(type: AbilityType, index: number = 1): Ability {
  const id = `ab-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  switch (type) {
    case 'passive':
      return {
        id,
        type: 'passive',
        name: `Passive Ability 0${index}`,
        desc: 'Grants continuous tactical enhancements to unit or party attributes.',
        icon: 'shield',
        iconBg: '#141414',
        iconColor: '#FFD93D',
        emoji: '🛡️',
      };
    case 'skill':
      return {
        id,
        type: 'skill',
        name: `Skill 0${index} — Tactical Command`,
        desc: 'Unleashes an active tactical strike or status effect in combat.',
        icon: 'crossed_swords',
        iconBg: '#141414',
        iconColor: '#4ECDC4',
        emoji: '⚡',
        cooldown: '20s',
      };
    case 'ultimate':
      return {
        id,
        type: 'ultimate',
        name: `Ultimate — Final Revelation 0${index}`,
        desc: 'Channel full burst energy to unleash screen-clearing devastating effects.',
        icon: 'stars_stack',
        iconBg: '#141414',
        iconColor: '#FF7A00',
        emoji: '☄️',
        cost: '100 SP',
      };
    case 'custom':
    default:
      return {
        id,
        type: 'custom',
        name: `Custom Ability 0${index}`,
        desc: 'Enter custom ability mechanics, conditional triggers, or specialized skill descriptions.',
        icon: 'sparkles',
        iconBg: '#141414',
        iconColor: '#B59CDD',
        emoji: '✨',
      };
  }
}
