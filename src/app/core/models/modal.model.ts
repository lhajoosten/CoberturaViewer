export interface ModalConfig {
    /** Title of the modal */
    title?: string;
    /** Width in pixels or percentage */
    width?: string;
    /** Height in pixels or percentage */
    height?: string;
    /** Whether modal can be closed by clicking outside or pressing ESC */
    closeOnOutsideClick?: boolean;
    /** Additional CSS classes */
    cssClass?: string;
    /** Modal z-index */
    zIndex?: number;
    /** Animation to use */
    animation?: 'fade' | 'slide' | 'zoom';
}