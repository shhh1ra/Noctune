import { useEffect, useRef, useState } from "react";
import { AvailableUpdate, checkForUpdate } from "../update-check";

export function useAvailableUpdate() {
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null);
  const updateCheckStarted = useRef(false);

  useEffect(() => {
    if (updateCheckStarted.current) return;
    updateCheckStarted.current = true;

    void checkForUpdate()
      .then(setAvailableUpdate)
      .catch(() => undefined);
  }, []);

  return [availableUpdate, setAvailableUpdate] as const;
}
