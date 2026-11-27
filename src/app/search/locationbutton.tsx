"use client";

import { LocateFixed, MapPinCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";

// IR-08: distance search needs the user's position. Sent with the form as hidden lat/lng fields.
export default function LocationButton() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState("");

  function locate() {
    if (!navigator.geolocation) {
      setStatus("이 브라우저는 위치 기능을 지원하지 않습니다.");
      return;
    }
    setStatus("위치를 찾는 중…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("현재 위치를 기준으로 거리를 잽니다.");
      },
      () => setStatus("위치를 가져오지 못했습니다. 브라우저에서 위치 권한을 허용해 주세요."),
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      {coords && (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
        </>
      )}
      <Button type="button" variant={coords ? "secondary" : "outline"} onClick={locate}>
        {coords ? <MapPinCheck data-icon="inline-start" /> : <LocateFixed data-icon="inline-start" />}
        {coords ? "위치 설정됨" : "내 위치 사용"}
      </Button>
      <FieldDescription aria-live="polite">
        {status || "거리 제한은 위치를 설정해야 적용됩니다."}
      </FieldDescription>
    </div>
  );
}
