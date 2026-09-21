import { useState } from "react";

export default function ImageSlider({ images }) {
  const [index, setIndex] = useState(0);
  if (!images || images.length === 0) return null;

  const prev = () => setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  const next = () => setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));

  return (
    <div className="img-slider">
      <div className="img-slider-tabs">
        {images.map((img, i) => (
          <button
            key={i}
            className={`img-slider-tab ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
          >
            {img.label || `이미지 ${i + 1}`}
          </button>
        ))}
      </div>

      <div className="img-slider-view">
        <img
  src={images[index].url}
  alt={images[index].label || ""}
/>
        <button className="img-slider-btn prev" onClick={prev}>‹</button>
        <button className="img-slider-btn next" onClick={next}>›</button>
        <div className="img-slider-count">{index + 1} / {images.length}</div>
      </div>
    </div>
  );
}
