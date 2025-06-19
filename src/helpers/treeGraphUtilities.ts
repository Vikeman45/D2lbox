/**
 * Calculates the minimum radius necessary for a circle positioned at the center of numeric text to fully
 * encircle the text
 * @param text The text to fit within the radius (actually only considers # of characters after the decimal place)
 * @param fontSize The height of the text in pixels (do not include the px unit)
 * @returns The smallest radius that encloses the text expressed as a unitless number (SVG at scale of 1)
 */
export function textHeightToRadius(text: string, fontSize: number) {
  const radiusScaleFactors = [0.8966263895, 1.320887967, 1.665425458] // for Slab Alfa One font
  const maxDecimalPlaces = 2
  const dotIndex = text.indexOf('.')
  const decimalPlaces = dotIndex === -1 ? 0 : Math.min(text.length - dotIndex - 1, maxDecimalPlaces)
  console.log(
    `decimalPlaces=${decimalPlaces} -> font-size ${fontSize} means r=${fontSize * radiusScaleFactors[decimalPlaces]}`,
  )
  return fontSize * radiusScaleFactors[decimalPlaces]
}

/**
 * Factory function to generate y-scale function with a defined top gap and uniform spacing between individual nodes.
 * @param dataPoints An arreay of the possible damage values
 * @param initialMargin The offset from the top of the SVG. If 0<`initialMargin`<1 it is considered a percentage of the `elementSize`. If it is greater than one, it is the actual top gap.
 * @param innerGap The vertical space between each node of the graph. If 0<`innerGap`<1 it is considered a percentage of the `elementSize`. If it is greater than one, it is the actual top gap.
 * @param elementSize The vertical dimension of the elements (assumed to be identically sized)
 * @returns A function to use to give the y-value for the center of a node in the graph (SVG unitless number @ scale=1)
 */
export function setSpacing(
  dataPoints: number[],
  initialMargin: number,
  innerGap: number,
  elementSize: number,
) {
  const top = initialMargin > 1 ? initialMargin : elementSize * initialMargin
  const gap = innerGap > 1 ? innerGap : elementSize * innerGap

  return function (value: number, n?: number) {
    n = n ?? dataPoints.indexOf(value)
    return top + elementSize / 2 + n * (elementSize + gap)
  }
}
