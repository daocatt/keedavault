import 'kdbxweb';

declare module 'kdbxweb' {
  interface KdbxGroup {
    isRecycleBin?: boolean;
  }
}
