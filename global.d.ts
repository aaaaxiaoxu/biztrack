import type {
  BizTrackCore,
  BizTrackI18n,
  BizTrackOrderState,
  BizTrackRepository,
  BizTrackTables,
  BizTrackValidation,
  EChartsRoot,
  TabulatorConstructor,
} from "./types";

declare global {
  interface Window {
    BizTrackCore: BizTrackCore;
    BizTrackI18n: BizTrackI18n;
    BizTrackOrderState: BizTrackOrderState;
    BizTrackRepository: BizTrackRepository;
    BizTrackTables: BizTrackTables;
    BizTrackValidation: BizTrackValidation;
    Tabulator?: TabulatorConstructor;
    echarts?: EChartsRoot;
    addOrUpdate?: (event: Event) => void;
    closeForm?: () => void;
    closeSidebar?: () => void;
    exportToCSV?: () => void;
    openForm?: () => void;
    openSidebar?: () => void;
    sortTable?: (column: string) => void;
  }
}

export {};
