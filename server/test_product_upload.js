import fs from 'fs';

async function testUpload() {
    const formData = new FormData();
    formData.append('name', 'Test Product');
    formData.append('description', 'Test Description');
    formData.append('price', '10.0');
    formData.append('currency', 'ZAR');
    formData.append('status', 'active');
    formData.append('type', 'digital');

    // Create a Blob from buffer
    const buffer = Buffer.from('dummy image content');
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('logo_image', blob, 'test_image.jpg');

    try {
        const res = await fetch('http://localhost:3001/api/products', {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        console.log("Response:", data);
        if (data.data && data.data.id) {
            console.log("Logo URL saved:", data.data.logo_url);
            // Delete it to cleanup
            await fetch(`http://localhost:3001/api/products/${data.data.id}`, { method: 'DELETE' });
            console.log("Cleaned up.");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

testUpload();
