import { getSupabaseClient } from './supabase';

export const fetchMonthlyBudget = async (
  userId: string,
  clerkToken: string
): Promise<number | null> => {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('settings')
      .select('monthly_budget')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseSettings] Error fetching budget settings:', error);
      return null;
    }

    if (data && data.monthly_budget !== null && data.monthly_budget !== undefined) {
      return parseFloat(data.monthly_budget);
    }
  } catch (err) {
    console.error('[SupabaseSettings] Unexpected error fetching budget:', err);
  }
  return null;
};

export const saveMonthlyBudget = async (
  userId: string,
  clerkToken: string,
  budget: number | null
): Promise<void> => {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: userId,
        monthly_budget: budget,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[SupabaseSettings] Error saving budget settings:', error);
    }
  } catch (err) {
    console.error('[SupabaseSettings] Unexpected error saving budget:', err);
  }
};
