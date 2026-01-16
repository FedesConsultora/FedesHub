// frontend/src/pages/Comercial/hooks/useLeads.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comercialApi } from '../../../api/comercial.js';
import { useState, useMemo } from 'react';

export const PageSize = 50;

export function useLeads(initialFilters = {}) {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        page: 0,
        limit: PageSize,
        ...initialFilters
    });

    const { data: catalogData, isLoading: loadingCatalog } = useQuery({
        queryKey: ['comercial', 'catalogs'],
        queryFn: () => comercialApi.getCatalogs(),
        select: (res) => res.data
    });

    const { data: listData, isLoading: loadingLeads, isFetching, error, refetch } = useQuery({
        queryKey: ['comercial', 'leads', filters],
        queryFn: () => comercialApi.listLeads({
            ...filters,
            offset: filters.page * PageSize
        }),
        select: (res) => res.data
    });

    const setFilter = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters, page: 0 }));
    };

    const setPage = (page) => {
        setFilters(prev => ({ ...prev, page }));
    };

    const total = listData?.count || 0;
    const rows = listData?.rows || [];

    return {
        catalog: catalogData || { statuses: [], etapas: [], fuentes: [], motivosPerdida: [] },
        rows,
        total,
        loading: loadingCatalog || loadingLeads,
        isFetching,
        error,
        filters,
        setFilter,
        setPage,
        refetch
    };
}
