export type DataRecord = Record<string, unknown>;

export type CsvRecord = Record<string, string | number | boolean | null | undefined>;

export interface StorageReader {
  getItem(key: string): string | null;
}

export interface StorageLike extends StorageReader {
  setItem(key: string, value: string): void;
}

export interface Product extends DataRecord {
  prodID: string;
  prodName: string;
  prodDesc: string;
  prodCat: string;
  prodPrice: number;
  prodSold: number;
}

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered";

export interface Order extends DataRecord {
  orderID: string;
  orderDate: string;
  itemName: string;
  itemPrice: number;
  qtyBought: number;
  shipping: number;
  taxes: number;
  orderTotal: number;
  orderStatus: OrderStatus;
}

export interface Transaction extends DataRecord {
  trID: number;
  trDate: string;
  trCategory: string;
  trAmount: number;
  trNotes: string;
}

export interface SummaryRow extends DataRecord {
  section: "Sales" | "Expenses";
  category: string;
  records: number;
  units: number;
  revenue: number;
  expenses: number;
  net: number;
  share: number;
}

export type I18nParams = Record<string, string | number | boolean | null | undefined>;

export interface I18nWrapper {
  readonly locale: string;
  t(key: string, params?: I18nParams): string;
  setLocale(locale: string): Promise<void>;
  getLocale(): string;
}

export interface BizTrackI18n {
  init(): Promise<void>;
  ready(): Promise<void>;
  t(key: string, params?: I18nParams): string;
  setLocale(locale: string): Promise<void>;
  getLocale(): string;
  applyTranslations(root?: Document | HTMLElement): void;
  useI18nWrapper(prefix: string): I18nWrapper;
  useCommonI18n(): I18nWrapper;
  useDashboardI18n(): I18nWrapper;
  useProductsI18n(): I18nWrapper;
  useOrdersI18n(): I18nWrapper;
  useExpensesI18n(): I18nWrapper;
  useHelpI18n(): I18nWrapper;
  useAboutI18n(): I18nWrapper;
  usePrivacyI18n(): I18nWrapper;
  useErrorPageI18n(): I18nWrapper;
  useRuleI18n(): I18nWrapper;
  useProgressI18n(): I18nWrapper;
  useParameterI18n(): I18nWrapper;
  useFeaturePermissionI18n(): I18nWrapper;
  useWebUII18n(): I18nWrapper;
  useFaceswapperI18n(): I18nWrapper;
  useVideoI18n(): I18nWrapper;
  useUserProfileI18n(): I18nWrapper;
  useGalleryI18n(prefix: string): I18nWrapper;
  useGalleryCommonI18n(): I18nWrapper;
  useGalleryModelsI18n(): I18nWrapper;
  useGalleryImagesI18n(): I18nWrapper;
  useCommentSectionI18n(): I18nWrapper;
  useToolkitsI18n(): I18nWrapper;
  useNotificationI18n(): I18nWrapper;
  useFollowI18n(): I18nWrapper;
}

export interface BizTrackCore {
  parseStoredArray<T>(storage: StorageReader, key: string, fallback: T[]): T[];
  toFiniteNumber(value: unknown, fallback?: number): number;
  assertNonNegativeNumber(value: unknown, fieldName: string): number;
  calculateOrderTotal(itemPrice: unknown, quantity: unknown, shipping: unknown, taxes: unknown): number;
  sumBy<T extends DataRecord>(items: T[], key: keyof T & string): number;
  nextTransactionId(transactions: Array<{ trID: unknown }>): number;
  escapeCsvValue(value: unknown): string;
  generateCSV(data: CsvRecord[]): string;
}

export interface LocalStorageRepositoryOptions<T extends DataRecord> {
  storage: StorageLike;
  key: string;
  defaults?: T[];
  idField?: keyof T & string;
  normalize?: (item: T) => T;
}

export interface LocalStorageRepository<T extends DataRecord> {
  add(item: T): T;
  all(): T[];
  existsById(id: unknown, exceptId?: unknown): boolean;
  findById(id: unknown): T | null;
  load(): T[];
  remove(id: unknown): boolean;
  saveAll(nextItems: T[]): T[];
  update(id: unknown, item: T): T | null;
}

export interface BizTrackRepository {
  createLocalStorageRepository<T extends DataRecord>(
    options: LocalStorageRepositoryOptions<T>,
  ): LocalStorageRepository<T>;
}

export type ValidationValues = DataRecord;

export type ValidationResult<T extends ValidationValues> = Partial<T> | void;

export type ValidationRule<T extends ValidationValues> = (values: T) => ValidationResult<T>;

export interface UniqueIdRuleOptions<T extends ValidationValues> {
  field: keyof T & string;
  exists(value: unknown, values: T): boolean;
  label?: string;
  message?: string | ((values: T) => string);
}

export interface BizTrackValidation {
  ValidationError: new (message: string) => Error;
  createPipeline<T extends ValidationValues>(rules: ValidationRule<T>[]): (input?: Partial<T>) => T;
  custom<T extends ValidationValues>(check: ValidationRule<T>): ValidationRule<T>;
  nonNegativeNumber<T extends ValidationValues>(
    field: keyof T & string,
    label: string,
    message?: string | ((values: T) => string),
  ): ValidationRule<T>;
  requiredField<T extends ValidationValues>(
    field: keyof T & string,
    label: string,
    message?: string | ((values: T) => string),
  ): ValidationRule<T>;
  uniqueId<T extends ValidationValues>(options: UniqueIdRuleOptions<T>): ValidationRule<T>;
}

export interface BizTrackOrderState {
  STATUSES: Readonly<Record<"PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED", OrderStatus>>;
  canTransition(fromStatus: unknown, toStatus: unknown): boolean;
  assertValidTransition(fromStatus: unknown, toStatus: unknown): OrderStatus;
  getAvailableStatuses(status: unknown): OrderStatus[];
  getStatusClass(status: unknown): string;
  isInitialStatus(status: unknown): boolean;
  isKnownStatus(status: unknown): status is OrderStatus;
  normalizeOrder<T extends DataRecord>(order: T): T & { orderStatus: OrderStatus };
  normalizeStatus(status: unknown): OrderStatus;
}

export interface TabulatorCell<T extends DataRecord = DataRecord> {
  getValue(): unknown;
  getRow(): {
    getData(): T;
  };
}

export interface TableColumn<T extends DataRecord = DataRecord> {
  title: string;
  field?: string;
  formatter?: string | ((cell: TabulatorCell<T>) => string | HTMLElement);
  headerSort?: boolean;
  hozAlign?: string;
  width?: number;
  download?: boolean;
  cellClick?: (event: Event, cell: TabulatorCell<T>) => void;
  bottomCalc?: string;
  bottomCalcFormatter?: (cell: TabulatorCell<T>) => string;
  sorter?: string;
  visible?: boolean;
  cssClass?: string;
  [key: string]: unknown;
}

export interface TabulatorOptions<T extends DataRecord = DataRecord> {
  data: T[];
  columns: TableColumn<T>[];
  layout: string;
  maxHeight: string;
  movableColumns: boolean;
  pagination: string;
  paginationSize: number;
  paginationSizeSelector: number[];
  placeholder: string;
  groupBy?: string;
  groupHeader?: (value: string, count: number) => string;
  groupStartOpen?: boolean;
}

export interface TabulatorTable<T extends DataRecord = DataRecord> {
  __bizTrackBuilt?: boolean;
  __bizTrackPendingSearch?: string;
  on(eventName: string, callback: () => void): void;
  setColumns(columns: TableColumn<T>[]): void;
  setGroupBy?(groupBy: string): void;
  setGroupHeader?(groupHeader?: (value: string, count: number) => string): void;
  replaceData(data: T[]): void;
  clearFilter(): void;
  setFilter(predicate: (data: T) => boolean): void;
  getData(filter?: string): T[];
  getSorters?(): Array<{ field?: string; dir?: string }>;
  setSort(column: string, direction: "asc" | "desc"): void;
  destroy(): void;
}

export interface TabulatorConstructor {
  new <T extends DataRecord = DataRecord>(selector: string, config: TabulatorOptions<T>): TabulatorTable<T>;
}

export interface TableCreateOptions<T extends DataRecord = DataRecord> {
  data: T[];
  columns: TableColumn<T>[];
  groupBy?: string;
  groupHeader?: (value: string, count: number) => string;
  maxHeight?: string;
  paginationSize?: number;
  placeholder?: string;
}

export interface ActionColumnOptions<T extends DataRecord = DataRecord> {
  title: string;
  editLabel: string | ((rowData: T) => string);
  deleteLabel: string | ((rowData: T) => string);
  onEdit(rowData: T): void;
  onDelete(rowData: T): void;
}

export interface BizTrackTables {
  actionColumn<T extends DataRecord>(options: ActionColumnOptions<T>): TableColumn<T>;
  applyGlobalSearch<T extends DataRecord>(table: TabulatorTable<T> | null | undefined, term: unknown): void;
  bindGlobalSearch<T extends DataRecord>(
    inputId: string,
    getTable: () => TabulatorTable<T> | null | undefined,
  ): void;
  createOrUpdateTable<T extends DataRecord>(
    table: TabulatorTable<T> | null | undefined,
    selector: string,
    options: TableCreateOptions<T>,
  ): TabulatorTable<T>;
  currencyFormatter<T extends DataRecord>(cell: TabulatorCell<T>): string;
  escapeHtml(value: unknown): string;
  formatCurrency(value: unknown): string;
  getActiveData<T extends DataRecord>(table: TabulatorTable<T> | null | undefined, fallback: T[]): T[];
  plainTextColumn<T extends DataRecord>(
    title: string,
    field: keyof T & string,
    options?: Partial<TableColumn<T>>,
  ): TableColumn<T>;
}

export type EChartOptions = Record<string, unknown>;

export interface EChartsInstance {
  dispose(): void;
  resize(): void;
  setOption(options: EChartOptions): void;
}

export interface EChartsRoot {
  init(element: HTMLElement): EChartsInstance;
}
