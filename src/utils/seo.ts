/**
 * SEO & Document Metadata Manager
 * Dynamically updates document.title, Open Graph tags, Twitter Cards, and Favicon
 * based on Super Admin Landing CMS or specific Tenant Store configurations.
 */

export interface MetaOptions {
    title?: string;
    description?: string;
    keywords?: string;
    author?: string;
    ogImage?: string;
    ogUrl?: string;
    faviconUrl?: string;
}

export function updatePageMeta(options: MetaOptions) {
    if (typeof document === 'undefined') return;

    // 1. Title
    if (options.title) {
        document.title = options.title;
        setMetaContent('#og-title', options.title, 'property', 'og:title');
        setMetaContent('#twitter-title', options.title, 'name', 'twitter:title');
    }

    // 2. Description
    if (options.description) {
        setMetaContent('#meta-description', options.description, 'name', 'description');
        setMetaContent('#og-description', options.description, 'property', 'og:description');
        setMetaContent('#twitter-description', options.description, 'name', 'twitter:description');
    }

    // 3. Keywords
    if (options.keywords) {
        setMetaContent('#meta-keywords', options.keywords, 'name', 'keywords');
    }

    // 4. Author
    if (options.author) {
        setMetaContent('#meta-author', options.author, 'name', 'author');
    }

    // 5. Open Graph URL
    const currentUrl = options.ogUrl || (typeof window !== 'undefined' ? window.location.href : '/');
    setMetaContent('#og-url', currentUrl, 'property', 'og:url');

    // 6. Share Image
    if (options.ogImage) {
        const fullImgUrl = options.ogImage.startsWith('http') || options.ogImage.startsWith('//')
            ? options.ogImage
            : `${window.location.origin}${options.ogImage.startsWith('/') ? '' : '/'}${options.ogImage}`;
        
        setMetaContent('#og-image', fullImgUrl, 'property', 'og:image');
        setMetaContent('#twitter-image', fullImgUrl, 'name', 'twitter:image');
    }

    // 7. Favicon
    if (options.faviconUrl) {
        let link = (document.getElementById('app-favicon') as HTMLLinkElement) || (document.querySelector("link[rel~='icon']") as HTMLLinkElement);
        if (!link) {
            link = document.createElement('link');
            link.id = 'app-favicon';
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = options.faviconUrl;
    }
}

function setMetaContent(selector: string, content: string, attrName: 'name' | 'property', attrValue: string) {
    let el = document.querySelector(selector) as HTMLMetaElement;
    if (!el) {
        el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement;
    }
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}
