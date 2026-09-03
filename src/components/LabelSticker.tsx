import {
  type LabelPrintOptions,
  type LabelProductData,
  type LabelElementKey,
  type LabelElementPosition,
  DEFAULT_LABEL_ELEMENT_ORDER,
  getEffectiveElementOrder,
  formatRupiah,
} from '@/lib/labelPrinter';
import { BarcodeGraphic } from '@/components/BarcodeGraphic';

export interface LabelStickerProps {
  product: LabelProductData;
  options: LabelPrintOptions;
  storeDisplayName?: string;
  isInteractive?: boolean;
  selectedElement?: LabelElementKey;
  onSelectElement?: (key: LabelElementKey) => void;
  onPointerDownElement?: (e: React.PointerEvent<HTMLDivElement>, key: LabelElementKey) => void;
  className?: string;
  style?: React.CSSProperties;
  isForPrint?: boolean;
}

// Font CSS resolver
export function getFontFamilyCss(family?: string): string {
  switch (family) {
    case 'monospace':
      return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    case 'Arial':
      return 'Arial, Helvetica, sans-serif';
    case 'Segoe UI':
      return '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    case 'serif':
      return 'Georgia, "Times New Roman", Times, serif';
    case 'sans-serif':
    default:
      return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
}

export const LabelSticker: React.FC<LabelStickerProps> = ({
  product,
  options,
  storeDisplayName,
  isInteractive = false,
  selectedElement,
  onSelectElement,
  onPointerDownElement,
  className = '',
  style = {},
  isForPrint = false,
}) => {
  const widthMm = options.widthMm || 30;
  const heightMm = options.heightMm || 19;
  const isCompact = heightMm <= 20;

  // Auto-calculated compact padding for small labels (like 30x19mm or 33x15mm)
  const paddingH = options.paddingHorizontalMm ?? (isCompact ? 0.6 : 1.0);
  const paddingV = options.paddingVerticalMm ?? (isCompact ? 0.3 : 0.8);
  const fontCss = getFontFamilyCss(options.fontFamily);
  const align = options.textAlign || 'center';

  const elementOrder: LabelElementKey[] = getEffectiveElementOrder(options.elementOrder);

  const store = (
    storeDisplayName ||
    options.customStoreName ||
    product.storeName ||
    product.brand ||
    'TOKO'
  ).trim().toUpperCase();

  const barcode = (product.barcode || product.sku || '000000').trim();

  const getElementPos = (key: LabelElementKey): LabelElementPosition => {
    return options.elementPositions?.[key] || { x: 0, y: 0 };
  };

  const renderElement = (key: LabelElementKey) => {
    const pos = getElementPos(key);
    const pad = options.elementPaddings?.[key] || { vertical: 0, horizontal: 0 };
    const isSelected = isInteractive && selectedElement === key;
    const transformStyle: React.CSSProperties = {
      position: 'relative',
      left: `${pos.x}mm`,
      top: `${pos.y}mm`,
      paddingTop: `${pad.vertical || 0}mm`,
      paddingBottom: `${pad.vertical || 0}mm`,
      paddingLeft: `${pad.horizontal || 0}mm`,
      paddingRight: `${pad.horizontal || 0}mm`,
      boxSizing: 'border-box',
    };

    switch (key) {
      case 'storeName':
        if (!options.showStoreName) return null;
        return (
          <div
            key="elem-store"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'storeName') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('storeName'); } : undefined}
            className={`w-full relative select-none transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded px-1 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
              textAlign: align,
            }}
          >
            <div
              className="font-bold tracking-tight uppercase truncate whitespace-nowrap w-full"
              style={{
                fontSize: `${options.storeNameFontSize || (isCompact ? 7.5 : 8)}px`,
                color: isForPrint ? '#000000' : undefined,
                textAlign: align,
                lineHeight: '1.0',
              }}
            >
              {store}
            </div>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                Toko ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
              </div>
            )}
          </div>
        );

      case 'productName':
        if (!options.showName) return null;
        const allowTwoLines = options.productNameTwoLines !== false;
        return (
          <div
            key="elem-product"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'productName') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('productName'); } : undefined}
            className={`w-full relative select-none overflow-hidden transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded px-0.5 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
              textAlign: align,
            }}
          >
            <div
              className="uppercase w-full overflow-hidden font-bold"
              style={{
                fontSize: `${options.productNameFontSize || (isCompact ? 8.5 : 9)}px`,
                fontWeight: options.fontWeight === 'normal' ? 600 : options.fontWeight === 'bold' ? 700 : 800,
                color: '#000000',
                textAlign: align,
                letterSpacing: '-0.2px',
                lineHeight: '1.1',
                display: '-webkit-box',
                WebkitLineClamp: allowTwoLines ? 2 : 1,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                overflow: 'hidden',
              }}
              title={product.name}
            >
              {product.name}
            </div>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                Nama ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
              </div>
            )}
          </div>
        );

      case 'barcode':
        if (!options.showBarcode) return null;
        const bcHeightMm = options.barcodeHeightMm || (isCompact ? 8 : 12);
        const barcodePixelHeight = Math.max(12, Math.round(bcHeightMm * 3.78));

        const barcodeAlignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';

        return (
          <div
            key="elem-barcode"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'barcode') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('barcode'); } : undefined}
            className={`w-full flex flex-col ${barcodeAlignClass} justify-center bg-white relative select-none transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded p-0.5 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
            }}
          >
            <div
              style={{
                width: `${options.barcodeAreaWidthPercent ?? 90}%`,
                height: `${bcHeightMm}mm`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
                overflow: 'hidden',
                margin: '0 auto',
              }}
            >
              <BarcodeGraphic
                value={barcode}
                format={options.barcodeType || 'CODE128'}
                fontFamily={options.fontFamily || 'monospace'}
                textAlign={align}
                className="max-w-full max-h-full pointer-events-none"
                width={options.barcodeWidthRatio || 1.0}
                height={barcodePixelHeight}
                displayValue={false}
                fontSize={options.barcodeTextFontSize || 7.5}
                margin={0}
              />
            </div>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                Barcode ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y}) • {bcHeightMm}mm
              </div>
            )}
          </div>
        );

      case 'barcodeText':
        if (!options.showBarcodeText) return null;
        return (
          <div
            key="elem-barcode-text"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'barcodeText') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('barcodeText'); } : undefined}
            className={`w-full relative select-none transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded px-1 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
              textAlign: align,
            }}
          >
            <span
              className="font-mono font-bold tracking-wider text-slate-900 block"
              style={{
                fontSize: `${options.barcodeTextFontSize || (isCompact ? 7.5 : 8)}px`,
                textAlign: align,
                color: '#000000',
                lineHeight: '1.0',
              }}
            >
              {barcode}
            </span>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                Digit ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
              </div>
            )}
          </div>
        );

      case 'sku':
        if (!options.showSku || !product.sku) return null;
        return (
          <div
            key="elem-sku"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'sku') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('sku'); } : undefined}
            className={`w-full relative select-none transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded px-1 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
              textAlign: align,
            }}
          >
            <span
              className="font-mono text-slate-700 block truncate"
              style={{
                fontSize: `${isCompact ? 7 : options.barcodeTextFontSize || 8}px`,
                textAlign: align,
                color: '#333333',
                lineHeight: '1.0',
              }}
            >
              SKU: {product.sku}
            </span>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                SKU ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
              </div>
            )}
          </div>
        );

      case 'price':
        if (!options.showPrice || product.price === undefined) return null;
        return (
          <div
            key="elem-price"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'price') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('price'); } : undefined}
            className={`w-full relative select-none transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded px-1 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
              textAlign: align,
            }}
          >
            <span
              className="font-black text-slate-950 tracking-tight font-mono block"
              style={{
                fontSize: `${options.priceFontSize || (isCompact ? 11 : 12)}px`,
                textAlign: align,
                color: '#000000',
                lineHeight: '1.05',
              }}
            >
              {formatRupiah(product.price)}
            </span>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                Harga ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
              </div>
            )}
          </div>
        );

      case 'category':
        if (!options.showCategory) return null;
        const categoryText = (product.category || (!isForPrint ? 'Kategori Produk' : '')).trim().toUpperCase();
        if (!categoryText) return null;
        return (
          <div
            key="elem-category"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'category') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('category'); } : undefined}
            className={`w-full relative select-none transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded px-1 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
              textAlign: align,
            }}
          >
            <span
              className="text-slate-900 font-bold block truncate uppercase tracking-tight"
              style={{
                fontSize: `${options.categoryFontSize || (isCompact ? 6.5 : 7.5)}px`,
                textAlign: align,
                color: '#000000',
                lineHeight: '1.0',
              }}
            >
              {categoryText}
            </span>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                Kategori ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
              </div>
            )}
          </div>
        );

      case 'subCategory':
        if (!options.showSubCategory) return null;
        const subCatVal = ((product as any).subCategory || (product as any).sub_category || (!isForPrint ? 'Sub-Kategori' : '')).trim();
        if (!subCatVal) return null;
        return (
          <div
            key="elem-subcategory"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'subCategory') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('subCategory'); } : undefined}
            className={`w-full relative select-none transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded px-1 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
              textAlign: align,
            }}
          >
            <span
              className="text-slate-700 font-semibold block truncate"
              style={{
                fontSize: `${options.subCategoryFontSize || (isCompact ? 6.5 : 7.5)}px`,
                textAlign: align,
                color: '#222222',
                lineHeight: '1.0',
              }}
            >
              {subCatVal}
            </span>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                Sub ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
              </div>
            )}
          </div>
        );

      case 'brand':
        if (!options.showBrand) return null;
        const brandText = (product.brand || (!isForPrint ? 'Merek Produk' : '')).trim().toUpperCase();
        if (!brandText) return null;
        return (
          <div
            key="elem-brand"
            onPointerDown={isInteractive && onPointerDownElement ? (e) => onPointerDownElement(e, 'brand') : undefined}
            onClick={isInteractive && onSelectElement ? (e) => { e.stopPropagation(); onSelectElement('brand'); } : undefined}
            className={`w-full relative select-none transition-all ${
              isInteractive
                ? `cursor-grab active:cursor-grabbing rounded px-1 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-xs'
                      : 'hover:ring-1 hover:ring-blue-300 hover:bg-slate-50'
                  }`
                : ''
            }`}
            style={{
              ...transformStyle,
              touchAction: isInteractive ? 'none' : undefined,
              textAlign: align,
            }}
          >
            <span
              className="text-slate-800 font-bold block truncate uppercase tracking-tight"
              style={{
                fontSize: `${options.brandFontSize || (isCompact ? 6.5 : 7.5)}px`,
                textAlign: align,
                color: '#111111',
                lineHeight: '1.0',
              }}
            >
              {brandText}
            </span>
            {isSelected && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-mono px-1 rounded shadow-xs pointer-events-none whitespace-nowrap z-10">
                Merek ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const sectionGapMm = options.sectionGapMm ?? 0.5;

  return (
    <div
      className={`bg-white text-slate-900 flex flex-col items-center select-none ${
        isForPrint ? '' : 'border border-slate-300 rounded-md shadow-xs'
      } ${className}`}
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        maxHeight: `${heightMm}mm`,
        padding: `${paddingV}mm ${paddingH}mm`,
        rowGap: `${sectionGapMm}mm`,
        justifyContent: 'center',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: fontCss,
        textAlign: align,
        overflow: 'hidden',
        ...style,
      }}
    >
      {elementOrder.map((key) => renderElement(key))}
    </div>
  );
};

