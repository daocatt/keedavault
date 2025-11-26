import {
  Folder, FolderOpen, Key, Globe, AlertTriangle, Server, PenTool, Settings, Home, Star, Lock, Wrench, FileText, Image, Music, Video, Code
} from 'lucide-react';
import React from 'react';

export const DEFAULT_ICONS = [
  'Key', 'World', 'Warning', 'Network', 'Apple', 'Windows', 'Linux',
  'Box', 'Disk', 'Drive', 'Folder', 'Home', 'Star', 'User', 'Lock'
];

export const ICONS_MAP: Record<number, React.ElementType> = {
  48: Folder,
  49: FolderOpen,
  0: Key,
  1: Globe,
  2: AlertTriangle,
  3: Server,
  6: PenTool,
  7: Settings,
  60: Home,
  61: Star,
  68: Lock,
  69: Wrench,
  4: FileText,
  5: Image,
  8: Music,
  9: Video,
  10: Code
};
