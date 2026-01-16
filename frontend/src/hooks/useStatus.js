// frontend/src/hooks/useStatus.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statusApi } from '../api/status';

export function useCustomStatuses() {
    return useQuery({
        queryKey: ['status', 'custom'],
        queryFn: statusApi.getCustom
    });
}

export function useFederStatus(feder_id) {
    return useQuery({
        queryKey: ['status', 'feder', feder_id],
        queryFn: () => statusApi.getFederStatus(feder_id),
        enabled: !!feder_id,
        refetchInterval: 60000, // Refetch every minute
    });
}

export function useSetStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: statusApi.setCurrent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['status'] });
            // Ideally also invalidate auth user if feder data is there
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        }
    });
}

export function useManageCustomStatuses() {
    const queryClient = useQueryClient();

    const add = useMutation({
        mutationFn: statusApi.addCustom,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status', 'custom'] })
    });

    const edit = useMutation({
        mutationFn: ({ id, data }) => statusApi.editCustom(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status', 'custom'] })
    });

    const remove = useMutation({
        mutationFn: (id) => statusApi.removeCustom(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status', 'custom'] })
    });

    return { add, edit, remove };
}
