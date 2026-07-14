export const metadata = { title: "Edit Transaction" };

export default function EditTransactionPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <section aria-labelledby="edit-tx-heading">
      <h1 id="edit-tx-heading">Edit Transaction</h1>
      <p>Transaction ID: {params.id}</p>
      <p>Edit form — UI coming in Phase 6.</p>
    </section>
  );
}
