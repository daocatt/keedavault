import {
  Folder, FolderOpen, Key, Globe, AlertTriangle, Server, PenTool, Settings, Home, Star, Lock, Wrench, FileText, Image, Music, Video, Code,
  Compass, Hotel, MapPinned, Plane, Pyramid, Receipt, Utensils, TentTree, CircleParking, Zap, Fuel, DraftingCompass, PaintRoller, Calendar, Clock, Map, Save, ClipboardCheck, Book, BookImage, Trophy, Youtube, StickyNote, Handshake, Glasses, Heart, Podcast, Radio, Hash, ShoppingBag, Squircle, Circle, Cylinder, Shapes, Shield, Box, ShieldQuestion, Fingerprint, FolderLock, FlaskConical, Palette, Camera, Baby, House, Mail, Shredder, Layers, Scroll, Skull, Gamepad2, Gem, Gift, FolderKey, File, Database, Cpu, Smile, Flag, LifeBuoy, AppWindow
} from 'lucide-react';
import React from 'react';

export const DEFAULT_ICONS = [
  'Compass', 'Hotel', 'MapPinned', 'Plane', 'Pyramid', 'Receipt', 'Utensils', 'TentTree', 'CircleParking', 'EvCharger', 'Fuel', 'Bolt', 'DraftingCompass', 'PaintRoller', 'Wrench', 'Calendar', 'Clock9', 'Map', 'Save', 'ClipboardCheck', 'Book', 'BookImage', 'Trophy', 'Youtube', 'StickyNote', 'Handshake', 'HaltGlasses', 'Heart', 'Podcast', 'Radio', 'Hash', 'ShoppingBag', 'Squircle', 'Circle', 'Cylinder', 'Shapes', 'Shield', 'Box', 'Lock', 'ShieldQuestion', 'Fingerprint', 'FolderLock', 'FlaskConical', 'Palette', 'Camera', 'Video', 'Image', 'Baby', 'House', 'Mail', 'Shredder', 'Layers2', 'Scroll', 'Skull', 'Gamepad2', 'Gem', 'Gift', 'Folder', 'FolderKey', 'File', 'Star', 'Database', 'Cpu', 'Server', 'Smile', 'Flag', 'LifeBuoy', 'Globe', 'Apple', 'AppWindow', 'Linux'
];

export const ICONS_MAP: Record<number, React.ElementType> = {
  0: Key,
  1: Globe,
  2: AlertTriangle,
  3: Server,
  4: FileText,
  5: Image,
  6: PenTool,
  7: Settings,
  8: Music,
  9: Video,
  10: Code,
  11: Compass,
  12: Hotel,
  13: MapPinned,
  14: Plane,
  15: Pyramid,
  16: Receipt,
  17: Utensils,
  18: TentTree,
  19: CircleParking,
  20: Zap, // EvCharger
  21: Fuel,
  22: Zap, // Bolt
  23: DraftingCompass,
  24: PaintRoller,
  25: Wrench,
  26: Calendar,
  27: Clock, // Clock9
  28: Map,
  29: Save,
  30: ClipboardCheck,
  31: Book,
  32: BookImage,
  33: Trophy,
  34: Youtube,
  35: StickyNote,
  36: Handshake,
  37: Glasses, // HaltGlasses
  38: Heart,
  39: Podcast,
  40: Radio,
  41: Hash,
  42: ShoppingBag,
  43: Squircle,
  44: Circle,
  45: Cylinder,
  46: Shapes,
  47: Shield,
  48: Folder,
  49: FolderOpen,
  50: Box,
  51: Lock,
  52: ShieldQuestion,
  53: Fingerprint,
  54: FolderLock,
  55: FlaskConical,
  56: Palette,
  57: Camera,
  58: Baby,
  59: House,
  60: Home,
  61: Star,
  62: Mail,
  63: Shredder,
  64: Layers, // Layers2
  65: Scroll,
  66: Skull,
  67: Gamepad2,
  68: Lock, // Duplicate Lock ID in original map, keeping consistent
  69: Wrench, // Duplicate Wrench ID in original map
  70: Gem,
  71: Gift,
  72: FolderKey,
  73: File,
  74: Database,
  75: Cpu,
  76: Smile,
  77: Flag,
  78: LifeBuoy,
  79: AppWindow, // Window
  80: Globe, // World
  81: Code, // Linux (using Code as placeholder or find specific Linux icon if available in Lucide, usually not)
  82: AppWindow // Apple (using AppWindow as placeholder)
};
