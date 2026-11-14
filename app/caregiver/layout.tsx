import { CaregiverAlertNotifier } from "@/components/caregiver/CaregiverAlertNotifier";

export default function CaregiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CaregiverAlertNotifier />
      {children}
    </>
  );
}

