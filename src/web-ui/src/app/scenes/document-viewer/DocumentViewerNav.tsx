import { NavigationPanel, NavigationPanelBody, NavigationPanelContent, NavigationPanelHeader, OverflowText, Icon } from '@openbitfun/ui';
import { FileText } from 'lucide-react';
import { useI18n } from '@/infrastructure/i18n';

export default function DocumentViewerNav() {
  const { t } = useI18n('scenes/documentViewer');

  return (
    <NavigationPanel className="openbitfun-document-viewer-nav" aria-label={t('documentViewer.title')}
      data-openbitfun-component="document-viewer-nav" data-openbitfun-part="root">
      <NavigationPanelHeader className="openbitfun-document-viewer-nav__header">
        <div className="openbitfun-document-viewer-nav__title">
          <Icon name="files" size="sm" className="text-muted-foreground" />
          <OverflowText className="openbitfun-document-viewer-nav__name">{t('documentViewer.title')}</OverflowText>
        </div>
      </NavigationPanelHeader>
      <NavigationPanelBody>
        <NavigationPanelContent className="openbitfun-document-viewer-nav__content">
          <div className="openbitfun-document-viewer-nav__empty">
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">{t('documentViewer.noDocument')}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{t('documentViewer.selectDocument')}</p>
            </div>
          </div>
        </NavigationPanelContent>
      </NavigationPanelBody>
    </NavigationPanel>
  );
}