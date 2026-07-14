export const metadata = { title: "User Detail — Admin" };

export default function AdminUserDetailPage({
  params,
}: {
  params: { uid: string };
}) {
  return (
    <section aria-labelledby="admin-user-detail-heading">
      <h1 id="admin-user-detail-heading">User Detail</h1>
      <p>UID: <code>{params.uid}</code></p>
      <p>Auth record, Firestore profile, transaction history, ban/promote controls — UI coming in Phase 6.</p>
    </section>
  );
}
