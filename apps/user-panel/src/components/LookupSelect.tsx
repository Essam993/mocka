import { useEffect } from "react";
import { Button, Select, type SelectProps } from "antd";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchLookup } from "../store/reducers/lookupsSlice";
import type { LookupKey } from "../types/collectionApi";

/** Loads a lookup once (cached in the store) and returns it. */
export function useLookup(key: LookupKey) {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((s) => s.Lookups[key]);

  useEffect(() => {
    dispatch(fetchLookup({ key }));
  }, [dispatch, key]);

  return {
    items,
    loading: status === "loading",
    failed: status === "failed",
    error,
    reload: () => dispatch(fetchLookup({ key, force: true })),
  };
}

interface Props extends Omit<SelectProps<number>, "options" | "loading"> {
  lookup: LookupKey;
}

/** A select whose options come from the API. Works inside <Form.Item>, the value is the item id. */
export function LookupSelect({ lookup, ...rest }: Props) {
  const { items, loading, failed, reload } = useLookup(lookup);

  return (
    <Select<number>
      showSearch
      optionFilterProp="label"
      loading={loading}
      options={items?.map((i) => ({ value: i.id, label: i.name }))}
      notFoundContent={
        failed ? (
          <Button type="link" size="small" onClick={reload}>
            Couldn't load. Try again
          </Button>
        ) : undefined
      }
      {...rest}
    />
  );
}
