/*
 * Last-resort public wishlist snapshot.
 *
 * The custom wishlist normally reads the live mirrored table and keeps a
 * last-known-good browser copy. This small, real snapshot is only used when
 * both of those paths are unavailable, so a temporary network/client failure
 * never replaces doll.gg's custom panel with an iframe.
 */
window.DOLL_WISHLIST_FALLBACK = Object.freeze([
    { throne_item_id: '3213D74E-BC8B-4C2B-AC87-754EC052429A', name: 'fishnet gartered bodysuit', price_cents: 28900, image_url: 'https://cdn.throne.com/wishlistItems/SVtrvPX5wbRctiRcdHeSCeuJT6u2/3213D74E-BC8B-4C2B-AC87-754EC052429A?version=1776278961390', position: 0 },
    { throne_item_id: '2502c41f-5456-4538-81e0-ac5dabefd33b', name: 'Holy Revelation Platform Heels - Bling - SILVER / US 7', price_cents: 18900, image_url: 'https://cdn.throne.com/wishlistItems/SVtrvPX5wbRctiRcdHeSCeuJT6u2/2502c41f-5456-4538-81e0-ac5dabefd33b?version=1782715102426', position: 1 },
    { throne_item_id: '0CAFCFA9-AB11-4F11-A696-0E830D8B8596', name: 'Tomodachi Life: Living the Dream - Nintendo Switch - Game only', price_cents: 6898, image_url: 'https://m.media-amazon.com/images/I/81TbBqrZ9AL._SY500_.jpg', position: 2 },
    { throne_item_id: '25DA555A-C8BA-4FCF-982E-45C284CFF0FE', name: 'Cheese Strings Sticks', price_cents: 4400, image_url: 'https://cdn.throne.com/wishlistItems/SVtrvPX5wbRctiRcdHeSCeuJT6u2/25DA555A-C8BA-4FCF-982E-45C284CFF0FE?version=1772764872739', position: 3 },
    { throne_item_id: 'C9184222-8E30-42E8-BF27-44F90BD77AD5', name: 'Serendipity Pink Heiress Cardigan Dress Coat Three Piece Set', price_cents: 29989, image_url: 'https://cdn.shopify.com/s/files/1/0825/2378/3452/files/serendipity-pink-heiress-cardigan-dress-coat-three-piece-4.jpg?v=1764317094', position: 5 },
    { throne_item_id: '8771D912-9ACC-4D1B-8D43-EE1694D361D5', name: 'Mew Mianmian Plaid Brown Black Mini Skirt', price_cents: 9999, image_url: 'https://cdn.shopify.com/s/files/1/0825/2378/3452/files/Mew-Mianmian-Plaid-Brown-Black-Mini-Skirt-4.jpg?v=1772853628', position: 6 },
    { throne_item_id: '71510e5f-e94f-4bde-8789-c373e8048980', name: 'lego Kevin & Dug', price_cents: 7998, image_url: 'https://cdn.throne.com/wishlistItems/71510e5f-e94f-4bde-8789-c373e8048980/b9ea9485-ec68-4b07-bdbb-dbf4771ec3c5.webp?version=1772745506277', position: 7 },
    { throne_item_id: '42DD0433-09EC-441B-8F13-8B2E36CD5585', name: 'SAVILAND Airbrush Gel Nail Polish Hema-Free: Dilution-Free 12PCS Non-Acetone Airbrush Paint for Nails 15ML Highly Saturated Macaron Colors Ombre Nail Polish Color Spray Airbrush for Nails Art Design - A-Macaron color', price_cents: 7998, image_url: 'https://cdn.throne.com/wishlistItems/SVtrvPX5wbRctiRcdHeSCeuJT6u2/42DD0433-09EC-441B-8F13-8B2E36CD5585?version=1772845131566', position: 8 },
    { throne_item_id: '2d6cf77c-8903-4a35-8f71-29045a45c837', name: 'Chan the Fawn Coat (Plain) by Angelic Pretty', price_cents: 41900, image_url: 'https://cdn.throne.com/wishlistItems/2d6cf77c-8903-4a35-8f71-29045a45c837/7bdbeb49-4b12-4fec-ac3a-2cb47941119b.webp?version=1772175678676', position: 9 },
    { throne_item_id: '67e21939-ca09-4328-894c-92374706bd54', name: 'Shop Too Faced Lip Injection Power Plumping Hydrating Liquid Lip Balm - Clear Pink', price_cents: 7900, image_url: 'https://cdn.throne.com/wishlistItems/67e21939-ca09-4328-894c-92374706bd54/428aa7cb-73b3-417a-a10c-1a8eaf9c7eba.webp?version=1775868770802', position: 12 },
    { throne_item_id: 'dc200467-1cbc-4c53-aea9-52218241685d', name: 'Heavenly Dress', price_cents: 27100, image_url: 'https://cdn.throne.com/wishlistItems/SVtrvPX5wbRctiRcdHeSCeuJT6u2/dc200467-1cbc-4c53-aea9-52218241685d?version=1776918143490', position: 13 },
    { throne_item_id: 'F5B857D0-F48B-427B-BC78-D8EA1846A345', name: 'LACE FISHNET BODYSUIT', price_cents: 31900, image_url: 'https://cdn.throne.com/wishlistItems/SVtrvPX5wbRctiRcdHeSCeuJT6u2/F5B857D0-F48B-427B-BC78-D8EA1846A345?version=1776279190875', position: 14 },
    { throne_item_id: 'E74D5615-B376-4DF7-80F5-2C0855354F73', name: 'Magnolia Branches', price_cents: 7900, image_url: 'https://cdn.throne.com/wishlistItems/E74D5615-B376-4DF7-80F5-2C0855354F73/385e3791-17b3-47a8-a0d5-b24b0811b7ff.webp?version=1773036518551', position: 15 },
    { throne_item_id: 'ED5F8483-788B-4F10-AA6E-565460CFEC73', name: 'SAVILAND Professional Nail Drill - Pink 40000 RPM', price_cents: 4511, image_url: 'https://m.media-amazon.com/images/I/71d6YxKJLRL._SY500_.jpg', position: 16 },
    { throne_item_id: '9150987a-733c-479d-907a-d77f11f9dc3d', name: 'Lego 101 Dalmatians Puppy', price_cents: 20500, image_url: 'https://cdn.throne.com/wishlistItems/9150987a-733c-479d-907a-d77f11f9dc3d/c760f656-03c7-44aa-b055-a84f9dd39345.webp?version=1771988151266', position: 17 },
    { throne_item_id: '407f2e93-509f-4b0b-a0a3-3d1204769466', name: 'lego Golden Retriever Puppy', price_cents: 19000, image_url: 'https://cdn.throne.com/wishlistItems/407f2e93-509f-4b0b-a0a3-3d1204769466/8653e027-3779-4a63-bd4a-f244218fc849.webp?version=1772745596473', position: 18 }
].map(item => Object.freeze(item)));
