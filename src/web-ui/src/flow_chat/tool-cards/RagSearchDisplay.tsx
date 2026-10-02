/**
 * Tool card for RAG (Retrieval-Augmented Generation) search results.
 * Displays semantic search results from Basemind with entity badges and source citations.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolCardProps } from '../types/flow-chat';
import { createLogger } from '@/shared/utils/logger';
import { useToolCardHeightContract } from './useToolCardHeightContract';

const log = createLogger('RagSearchDisplay');

interface RagSearchHit {
  chunk: string;
  source_doc: string;
  score: number;
  entity_ids: string[];
}

export const RagSearchDisplay: React.FC<ToolCardProps> = ({
  toolItem,
  onExpand
}) => {
  const { t } = useTranslation('flow-chat');
  const { toolCall, toolResult, status } = toolItem;
  const [isExpanded, setIsExpanded] = useState(false);
  const toolId = toolItem.id ?? toolCall?.id;
  const { cardRootRef, applyExpandedState } = useToolCardHeightContract({
    toolId,
    toolName: toolItem.toolName,
  });

  const getQuery = useCallback((): string => {
    const query = toolCall?.input?.query || toolCall?.input?.text;
    
    if (!query) {
      const isEarlyDetection = toolCall?.input?._early_detection === true;
      const isPartialParams = toolCall?.input?._partial_params === true;
      
      if (isEarlyDetection || isPartialParams) {
        return t('toolCards.ragSearch.parsingQuery');
      }
      
      return t('toolCards.ragSearch.parsingQuery');
    }
    
    return query;
  }, [toolCall, t]);

  const searchResults = useMemo(() => {
    if (!toolResult?.result) return null;
    
    const result = toolResult.result;
    
    if (result.hits && Array.isArray(result.hits)) {
      return {
        hits: result.hits as RagSearchHit[],
        query: result.query,
      };
    }
    
    return null;
  }, [toolResult]);

  const stats = useMemo(() => {
    if (!searchResults) return { hits: 0 };
    
    return {
      hits: searchResults.hits.length,
    };
  }, [searchResults]);

  const query = getQuery();
  const hasResultData = toolResult?.result !== undefined && toolResult?.result !== null;
  const hasResults = searchResults && searchResults.hits.length > 0;
  const isExpandable = status === 'completed' && hasResultData;

  const handleToggle = useCallback(() => {
    if (isExpandable) {
      applyExpandedState(isExpanded, !isExpanded, setIsExpanded, {
        onExpand,
      });
    }
  }, [applyExpandedState, isExpanded, isExpandable, onExpand]);

  const renderAction = () => {
    if (status === 'completed') {
      return `${t('toolCards.ragSearch.searchText')}:`;
    }
    if (status === 'running' || status === 'streaming') {
      return t('toolCards.ragSearch.searchingText');
    }
    if (status === 'pending') {
      return t('toolCards.ragSearch.preparingSearch');
    }
    return undefined;
  };

  const renderContent = () => {
    if (status === 'completed') {
      let resultsText = '';
      if (hasResultData && searchResults) {
        resultsText = ` (${t('toolCards.ragSearch.matchesCount', { count: stats.hits })})`;
      }
      return `${query}${resultsText}`;
    }
    if (status === 'running' || status === 'streaming') {
      return `${query}...`;
    }
    if (status === 'pending') {
      return query;
    }
    return query;
  };

  const handleOpenSource = useCallback(async (sourceDoc: string) => {
    log.info('Open source document from RAG result', { sourceDoc });
  }, []);

  if (status === 'error') {
    return null;
  }

  return (
    <div ref={cardRootRef} data-openbitfun-adapter="rag-search" data-tool-card-id={toolId ?? ''}>
      <div
        className="rag-search-tool-card"
        data-openbitfun-component="rag-search-tool-card"
        data-openbitfun-part="root"
      >
        <div className="rag-search-tool-card__header">
          <div className="rag-search-tool-card__action">
            {renderAction()}
          </div>
          <div className="rag-search-tool-card__summary">
            {renderContent()}
          </div>
          {isExpandable && (
            <button
              className="rag-search-tool-card__toggle"
              onClick={handleToggle}
              aria-expanded={isExpanded}
              aria-controls={`rag-search-details-${toolId}`}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>
        
        {isExpanded && (
          <div id={`rag-search-details-${toolId}`} className="rag-search-tool-card__details">
            {hasResults && searchResults!.hits.map((hit: RagSearchHit) => (
              <div key={hit.source_doc} className="rag-search-tool-card__result">
                <div className="rag-search-tool-card__result-header">
                  <span className="rag-search-tool-card__result-title">{hit.source_doc}</span>
                  <span className="rag-search-tool-card__result-score">
                    {t('toolCards.ragSearch.scoreLabel', { score: (hit.score * 100).toFixed(0) })}
                  </span>
                </div>
                <div className="rag-search-tool-card__result-snippet">
                  {hit.chunk}
                </div>
                <div className="rag-search-tool-card__result-footer">
                  <span className="rag-search-tool-card__result-score">
                    {t('toolCards.ragSearch.scoreLabel', { score: (hit.score * 100).toFixed(0) })}
                  </span>
                  {hit.entity_ids.length > 0 ? (
                    <span className="rag-search-tool-card__entities">
                      {hit.entity_ids.map((id) => (
                        <span key={id} className="rag-search-tool-card__entity-tag">
                          {id}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <button
                    className="rag-search-tool-card__open-source"
                    onClick={() => handleOpenSource(hit.source_doc)}
                  >
                    {t('toolCards.ragSearch.openSource')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RagSearchDisplay;