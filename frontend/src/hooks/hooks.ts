import type { AppDispatch, RootState } from '@/store/store';
import { useDispatch, useSelector } from 'react-redux';

// Dùng hai hook này thay cho useDispatch/useSelector để có sẵn kiểu RootState, AppDispatch
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
